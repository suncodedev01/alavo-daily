use serde::ser::{Serializer, SerializeStruct};

/// Shape every command error takes when it reaches JavaScript: a stable code and a readable message.
pub fn serialize_code_and_message<S: Serializer>(
    serializer: S,
    code: &str,
    message: &str,
) -> Result<S::Ok, S::Error> {
    let mut state = serializer.serialize_struct("CommandError", 2)?;
    state.serialize_field("code", code)?;
    state.serialize_field("message", message)?;
    state.end()
}
