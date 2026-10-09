use std::io::{self, Read, Write};
use std::net::{Ipv4Addr, TcpListener, TcpStream};
use std::thread;
use std::time::{Duration, Instant};

use super::authorization::{parse_redirect_request, RedirectOutcome};
use super::error::AuthError;

const POLL_INTERVAL: Duration = Duration::from_millis(50);
const REQUEST_READ_TIMEOUT: Duration = Duration::from_secs(2);
const MAX_REQUEST_BYTES: usize = 8 * 1024;

const SUCCESS_PAGE: &str = "<h1>Bạn có thể quay lại ứng dụng</h1>\
    <p>Alavo Daily đã nhận được quyền truy cập. Bạn có thể đóng tab này.</p>";
const DENIED_PAGE: &str = "<h1>Chưa kết nối được với Google</h1>\
    <p>Bạn có thể đóng tab này và thử lại trong ứng dụng.</p>";

/// A listener on a random local port that waits for Google to send the browser back once.
pub struct LoopbackServer {
    listener: TcpListener,
}

impl LoopbackServer {
    pub fn bind() -> io::Result<Self> {
        Ok(Self { listener: TcpListener::bind((Ipv4Addr::LOCALHOST, 0))? })
    }

    pub fn redirect_uri(&self) -> Result<String, AuthError> {
        let port = self.listener.local_addr().map_err(|_| AuthError::Internal)?.port();
        Ok(format!("http://127.0.0.1:{port}/"))
    }

    pub fn wait_for_code(self, state: &str, timeout: Duration) -> Result<String, AuthError> {
        self.listener.set_nonblocking(true).map_err(|_| AuthError::Internal)?;
        let deadline = Instant::now() + timeout;
        while Instant::now() < deadline {
            match self.listener.accept() {
                Ok((stream, _)) => {
                    if let Some(result) = answer_connection(stream, state) {
                        return result;
                    }
                }
                Err(error) if error.kind() == io::ErrorKind::WouldBlock => thread::sleep(POLL_INTERVAL),
                Err(_) => return Err(AuthError::Internal),
            }
        }
        Err(AuthError::TimedOut)
    }
}

fn answer_connection(mut stream: TcpStream, state: &str) -> Option<Result<String, AuthError>> {
    let request = read_request_head(&mut stream)?;
    let outcome = parse_redirect_request(&request, state);
    let (status, page) = match &outcome {
        RedirectOutcome::Code(_) => ("200 OK", SUCCESS_PAGE),
        RedirectOutcome::Denied => ("200 OK", DENIED_PAGE),
        RedirectOutcome::Ignored => ("404 Not Found", ""),
    };
    send_page(&mut stream, status, page);
    match outcome {
        RedirectOutcome::Code(code) => Some(Ok(code)),
        RedirectOutcome::Denied => Some(Err(AuthError::AccessDenied)),
        RedirectOutcome::Ignored => None,
    }
}

fn read_request_head(stream: &mut TcpStream) -> Option<String> {
    stream.set_nonblocking(false).ok()?;
    stream.set_read_timeout(Some(REQUEST_READ_TIMEOUT)).ok()?;
    let mut received = Vec::new();
    let mut chunk = [0u8; 1024];
    while received.len() < MAX_REQUEST_BYTES && !received.contains(&b'\n') {
        let count = stream.read(&mut chunk).ok()?;
        if count == 0 {
            break;
        }
        received.extend_from_slice(&chunk[..count]);
    }
    Some(String::from_utf8_lossy(&received).into_owned())
}

fn send_page(stream: &mut TcpStream, status: &str, body: &str) {
    let document = if body.is_empty() { String::new() } else { html_document(body) };
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\
         Cache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nConnection: close\r\n\r\n{document}",
        document.len()
    );
    let _ = stream.write_all(response.as_bytes()).and_then(|()| stream.flush());
}

fn html_document(body: &str) -> String {
    format!(
        "<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\">\
         <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\
         <title>Alavo Daily</title><style>:root{{color-scheme:light dark}}\
         body{{font-family:system-ui,sans-serif;max-width:32rem;margin:20vh auto;padding:0 1rem}}\
         </style></head><body>{body}</body></html>"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn browser_visit(port: u16, target: &str) -> String {
        let mut stream = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).expect("server is listening");
        write!(stream, "GET {target} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n").expect("request is sent");
        let mut answer = String::new();
        stream.read_to_string(&mut answer).expect("answer is read");
        answer
    }

    fn start(state: &'static str, timeout: Duration) -> (u16, thread::JoinHandle<Result<String, AuthError>>) {
        let server = LoopbackServer::bind().expect("a local port is free");
        let port = server.listener.local_addr().expect("address").port();
        (port, thread::spawn(move || server.wait_for_code(state, timeout)))
    }

    #[test]
    fn redirect_uri_points_at_the_loopback_address_and_the_bound_port() {
        let server = LoopbackServer::bind().expect("a local port is free");
        let port = server.listener.local_addr().expect("address").port();
        assert_eq!(server.redirect_uri(), Ok(format!("http://127.0.0.1:{port}/")));
    }

    #[test]
    fn captures_the_code_and_tells_the_person_to_return_to_the_app() {
        let (port, waiting) = start("s1", Duration::from_secs(5));
        let answer = browser_visit(port, "/?state=s1&code=abc");
        assert!(answer.starts_with("HTTP/1.1 200 OK"));
        assert!(answer.contains("Bạn có thể quay lại ứng dụng"));
        assert_eq!(waiting.join().expect("thread finishes"), Ok("abc".to_string()));
    }

    #[test]
    fn keeps_waiting_after_a_favicon_request_and_a_wrong_state() {
        let (port, waiting) = start("s1", Duration::from_secs(5));
        assert!(browser_visit(port, "/favicon.ico").starts_with("HTTP/1.1 404"));
        assert!(browser_visit(port, "/?state=forged&code=evil").starts_with("HTTP/1.1 404"));
        browser_visit(port, "/?state=s1&code=real");
        assert_eq!(waiting.join().expect("thread finishes"), Ok("real".to_string()));
    }

    #[test]
    fn reports_a_refusal() {
        let (port, waiting) = start("s1", Duration::from_secs(5));
        browser_visit(port, "/?state=s1&error=access_denied");
        assert_eq!(waiting.join().expect("thread finishes"), Err(AuthError::AccessDenied));
    }

    #[test]
    fn gives_up_after_the_timeout() {
        let (_, waiting) = start("s1", Duration::from_millis(200));
        assert_eq!(waiting.join().expect("thread finishes"), Err(AuthError::TimedOut));
    }
}
