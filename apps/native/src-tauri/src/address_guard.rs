use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

use url::{Host, Url};

#[derive(Debug, PartialEq, Eq)]
pub enum UrlRejection {
    NotAUrl,
    UnsupportedScheme,
    MissingHost,
    BlockedAddress,
}

pub fn parse_public_url(text: &str) -> Result<Url, UrlRejection> {
    let url = Url::parse(text.trim()).map_err(|_| UrlRejection::NotAUrl)?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err(UrlRejection::UnsupportedScheme);
    }
    match url.host() {
        None => Err(UrlRejection::MissingHost),
        Some(Host::Domain(name)) if is_local_name(name) => Err(UrlRejection::BlockedAddress),
        Some(Host::Ipv4(ip)) if !is_public_address(IpAddr::V4(ip)) => Err(UrlRejection::BlockedAddress),
        Some(Host::Ipv6(ip)) if !is_public_address(IpAddr::V6(ip)) => Err(UrlRejection::BlockedAddress),
        Some(_) => Ok(url),
    }
}

fn is_local_name(name: &str) -> bool {
    let name = name.trim_end_matches('.').to_ascii_lowercase();
    name == "localhost" || name.ends_with(".localhost")
}

pub fn is_public_address(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => is_public_v4(v4),
        IpAddr::V6(v6) => is_public_v6(v6),
    }
}

fn is_public_v4(ip: Ipv4Addr) -> bool {
    let [first, second, third, _] = ip.octets();
    let blocked = ip.is_unspecified()
        || ip.is_loopback()
        || ip.is_private()
        || ip.is_link_local()
        || ip.is_broadcast()
        || ip.is_documentation()
        || ip.is_multicast()
        || first == 0
        || first >= 240
        || (first == 100 && (64..=127).contains(&second))
        || (first == 192 && second == 0 && third == 0)
        || (first == 198 && (18..=19).contains(&second));
    !blocked
}

fn is_public_v6(ip: Ipv6Addr) -> bool {
    if let Some(embedded) = ip.to_ipv4() {
        return is_public_v4(embedded);
    }
    let first = ip.segments()[0];
    let blocked = ip.is_unspecified()
        || ip.is_loopback()
        || ip.is_multicast()
        || (first & 0xfe00) == 0xfc00
        || (first & 0xffc0) == 0xfe80
        || is_nat64_of_blocked_v4(ip)
        || (first == 0x2001 && ip.segments()[1] == 0x0db8);
    !blocked
}

fn is_nat64_of_blocked_v4(ip: Ipv6Addr) -> bool {
    let segments = ip.segments();
    if segments[..6] != [0x64, 0xff9b, 0, 0, 0, 0] {
        return false;
    }
    let embedded = Ipv4Addr::new(
        (segments[6] >> 8) as u8,
        segments[6] as u8,
        (segments[7] >> 8) as u8,
        segments[7] as u8,
    );
    !is_public_v4(embedded)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn addr(text: &str) -> IpAddr {
        text.parse().expect("test address parses")
    }

    #[test]
    fn rejects_loopback_private_and_link_local_ipv4() {
        for text in [
            "127.0.0.1",
            "10.1.2.3",
            "172.16.0.1",
            "172.31.255.255",
            "192.168.1.1",
            "169.254.169.254",
            "0.0.0.0",
            "100.64.0.1",
            "255.255.255.255",
            "224.0.0.1",
        ] {
            assert!(!is_public_address(addr(text)), "{text} must be blocked");
        }
    }

    #[test]
    fn accepts_public_ipv4() {
        for text in ["93.184.216.34", "8.8.8.8", "172.32.0.1", "100.128.0.1"] {
            assert!(is_public_address(addr(text)), "{text} must be allowed");
        }
    }

    #[test]
    fn rejects_local_ipv6_and_ipv4_hidden_inside_ipv6() {
        for text in [
            "::1",
            "::",
            "fe80::1",
            "fc00::1",
            "fd12:3456::1",
            "ff02::1",
            "::ffff:127.0.0.1",
            "::ffff:10.0.0.1",
            "64:ff9b::a00:1",
            "2001:db8::1",
        ] {
            assert!(!is_public_address(addr(text)), "{text} must be blocked");
        }
    }

    #[test]
    fn accepts_public_ipv6() {
        assert!(is_public_address(addr("2606:4700:4700::1111")));
        assert!(is_public_address(addr("::ffff:8.8.8.8")));
    }

    #[test]
    fn accepts_ordinary_web_addresses() {
        assert!(parse_public_url("https://example.com/cong-thuc?id=1").is_ok());
        assert!(parse_public_url("  http://93.184.216.34:8080/a ").is_ok());
    }

    #[test]
    fn rejects_text_that_is_not_a_url() {
        assert_eq!(parse_public_url("khong phai url"), Err(UrlRejection::NotAUrl));
        assert_eq!(parse_public_url(""), Err(UrlRejection::NotAUrl));
    }

    #[test]
    fn rejects_schemes_other_than_http_and_https() {
        for text in ["file:///etc/passwd", "ftp://example.com/a", "javascript:alert(1)"] {
            assert_eq!(parse_public_url(text), Err(UrlRejection::UnsupportedScheme), "{text}");
        }
    }

    #[test]
    fn rejects_local_host_names_and_literal_private_addresses() {
        for text in [
            "http://localhost:8080/",
            "http://LOCALHOST./",
            "http://app.localhost/",
            "http://127.0.0.1/",
            "http://[::1]/",
            "http://192.168.0.10/router",
            "http://169.254.169.254/latest/meta-data",
        ] {
            assert_eq!(parse_public_url(text), Err(UrlRejection::BlockedAddress), "{text}");
        }
    }

    #[test]
    fn rejects_addresses_written_in_disguised_forms() {
        for text in ["http://2130706433/", "http://0x7f.1/", "http://0177.0.0.1/", "http://127.1/"] {
            assert_eq!(parse_public_url(text), Err(UrlRejection::BlockedAddress), "{text}");
        }
    }
}
