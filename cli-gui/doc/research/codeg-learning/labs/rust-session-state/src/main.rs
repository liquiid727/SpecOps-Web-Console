use codeg_learning_rust_session_state::{Command, SessionState};

fn main() {
    let mut state = SessionState::new();
    let events = state
        .apply_all([
            Command::Start,
            Command::TextDelta("A small state machine".into()),
            Command::ToolStarted("demo-tool".into()),
            Command::ToolFinished("demo-tool".into()),
            Command::Finish,
        ])
        .expect("demo commands should be valid");

    println!("status: {:?}", state.status());
    println!("text: {}", state.text());
    println!("events: {events:#?}");
}
