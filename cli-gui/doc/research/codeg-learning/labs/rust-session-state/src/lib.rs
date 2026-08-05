use std::collections::BTreeSet;
use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SessionStatus {
    Idle,
    Running,
    WaitingForPermission,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Command {
    Start,
    TextDelta(String),
    ToolStarted(String),
    ToolFinished(String),
    PermissionRequested(String),
    PermissionResolved { request_id: String, allowed: bool },
    Finish,
    Fail(String),
    Cancel,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum EventKind {
    Started,
    TextAppended(String),
    ToolStarted(String),
    ToolFinished(String),
    PermissionRequested(String),
    PermissionResolved { request_id: String, allowed: bool },
    Completed,
    Failed(String),
    Cancelled,
    CancelIgnored,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DomainEvent {
    pub sequence: u64,
    pub kind: EventKind,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TransitionError {
    InvalidCommand {
        status: SessionStatus,
        command: &'static str,
    },
    DuplicateTool(String),
    UnknownTool(String),
    WrongPermission(String),
    OpenWork {
        tools: usize,
        permission_pending: bool,
    },
}

impl fmt::Display for TransitionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidCommand { status, command } => {
                write!(f, "cannot apply {command:?} while session is {status:?}")
            }
            Self::DuplicateTool(id) => write!(f, "tool {id:?} is already running"),
            Self::UnknownTool(id) => write!(f, "tool {id:?} is not running"),
            Self::WrongPermission(id) => write!(f, "permission {id:?} is not pending"),
            Self::OpenWork {
                tools,
                permission_pending,
            } => write!(
                f,
                "session still has {tools} running tool(s), permission pending: {permission_pending}"
            ),
        }
    }
}

impl std::error::Error for TransitionError {}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SessionState {
    status: SessionStatus,
    text: String,
    running_tools: BTreeSet<String>,
    pending_permission: Option<String>,
    next_sequence: u64,
}

impl Default for SessionState {
    fn default() -> Self {
        Self::new()
    }
}

impl SessionState {
    pub fn new() -> Self {
        Self {
            status: SessionStatus::Idle,
            text: String::new(),
            running_tools: BTreeSet::new(),
            pending_permission: None,
            next_sequence: 1,
        }
    }

    pub fn status(&self) -> &SessionStatus {
        &self.status
    }

    pub fn text(&self) -> &str {
        &self.text
    }

    pub fn running_tools(&self) -> &BTreeSet<String> {
        &self.running_tools
    }

    pub fn pending_permission(&self) -> Option<&str> {
        self.pending_permission.as_deref()
    }

    pub fn next_sequence(&self) -> u64 {
        self.next_sequence
    }

    pub fn apply(&mut self, command: Command) -> Result<DomainEvent, TransitionError> {
        let event = match command {
            Command::Start if self.status == SessionStatus::Idle => EventKind::Started,
            Command::TextDelta(delta) if self.can_receive_output() => {
                self.text.push_str(&delta);
                EventKind::TextAppended(delta)
            }
            Command::ToolStarted(id) if self.status == SessionStatus::Running => {
                if !self.running_tools.insert(id.clone()) {
                    return Err(TransitionError::DuplicateTool(id));
                }
                EventKind::ToolStarted(id)
            }
            Command::ToolFinished(id)
                if matches!(
                    self.status,
                    SessionStatus::Running | SessionStatus::WaitingForPermission
                ) =>
            {
                if !self.running_tools.remove(&id) {
                    return Err(TransitionError::UnknownTool(id));
                }
                EventKind::ToolFinished(id)
            }
            Command::PermissionRequested(request_id) if self.status == SessionStatus::Running => {
                self.pending_permission = Some(request_id.clone());
                self.status = SessionStatus::WaitingForPermission;
                EventKind::PermissionRequested(request_id)
            }
            Command::PermissionResolved {
                request_id,
                allowed,
            } if self.status == SessionStatus::WaitingForPermission => {
                if self.pending_permission.as_deref() != Some(request_id.as_str()) {
                    return Err(TransitionError::WrongPermission(request_id));
                }
                self.pending_permission = None;
                self.status = if allowed {
                    SessionStatus::Running
                } else {
                    SessionStatus::Failed
                };
                EventKind::PermissionResolved {
                    request_id,
                    allowed,
                }
            }
            Command::Finish if self.status == SessionStatus::Running => {
                if !self.running_tools.is_empty() || self.pending_permission.is_some() {
                    return Err(TransitionError::OpenWork {
                        tools: self.running_tools.len(),
                        permission_pending: self.pending_permission.is_some(),
                    });
                }
                self.status = SessionStatus::Completed;
                EventKind::Completed
            }
            Command::Fail(message) if self.is_active() => {
                self.running_tools.clear();
                self.pending_permission = None;
                self.status = SessionStatus::Failed;
                EventKind::Failed(message)
            }
            Command::Cancel if self.is_active() => {
                self.running_tools.clear();
                self.pending_permission = None;
                self.status = SessionStatus::Cancelled;
                EventKind::Cancelled
            }
            Command::Cancel
                if matches!(
                    self.status,
                    SessionStatus::Completed | SessionStatus::Failed | SessionStatus::Cancelled
                ) =>
            {
                EventKind::CancelIgnored
            }
            other => {
                return Err(TransitionError::InvalidCommand {
                    status: self.status.clone(),
                    command: command_name(&other),
                })
            }
        };

        // State changes above are synchronous. The sequence is assigned only after a
        // command has been accepted, which makes failed transitions invisible to
        // snapshot/replay consumers.
        let event = DomainEvent {
            sequence: self.next_sequence,
            kind: event,
        };
        self.next_sequence += 1;

        if event.kind == EventKind::Started {
            self.status = SessionStatus::Running;
        }

        Ok(event)
    }

    pub fn apply_all<I>(&mut self, commands: I) -> Result<Vec<DomainEvent>, TransitionError>
    where
        I: IntoIterator<Item = Command>,
    {
        commands
            .into_iter()
            .map(|command| self.apply(command))
            .collect()
    }

    fn is_active(&self) -> bool {
        matches!(
            self.status,
            SessionStatus::Running | SessionStatus::WaitingForPermission
        )
    }

    fn can_receive_output(&self) -> bool {
        matches!(
            self.status,
            SessionStatus::Running | SessionStatus::WaitingForPermission
        )
    }
}

fn command_name(command: &Command) -> &'static str {
    match command {
        Command::Start => "Start",
        Command::TextDelta(_) => "TextDelta",
        Command::ToolStarted(_) => "ToolStarted",
        Command::ToolFinished(_) => "ToolFinished",
        Command::PermissionRequested(_) => "PermissionRequested",
        Command::PermissionResolved { .. } => "PermissionResolved",
        Command::Finish => "Finish",
        Command::Fail(_) => "Fail",
        Command::Cancel => "Cancel",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn applies_a_normal_turn_and_keeps_event_sequences_contiguous() {
        let mut state = SessionState::new();
        let events = state
            .apply_all([
                Command::Start,
                Command::TextDelta("hello".into()),
                Command::ToolStarted("tool-1".into()),
                Command::ToolFinished("tool-1".into()),
                Command::TextDelta(" world".into()),
                Command::Finish,
            ])
            .expect("normal turn should succeed");

        assert_eq!(state.status(), &SessionStatus::Completed);
        assert_eq!(state.text(), "hello world");
        assert_eq!(state.next_sequence(), 7);
        assert_eq!(
            events
                .iter()
                .map(|event| event.sequence)
                .collect::<Vec<_>>(),
            vec![1, 2, 3, 4, 5, 6]
        );
    }

    #[test]
    fn permission_must_be_resolved_before_finish() {
        let mut state = SessionState::new();
        state.apply(Command::Start).unwrap();
        state
            .apply(Command::PermissionRequested("permission-1".into()))
            .unwrap();

        let error = state.apply(Command::Finish).unwrap_err();
        assert_eq!(
            error,
            TransitionError::InvalidCommand {
                status: SessionStatus::WaitingForPermission,
                command: "Finish"
            }
        );

        state
            .apply(Command::PermissionResolved {
                request_id: "permission-1".into(),
                allowed: true,
            })
            .unwrap();
        state.apply(Command::Finish).unwrap();
        assert_eq!(state.status(), &SessionStatus::Completed);
    }

    #[test]
    fn cancel_is_idempotent_after_the_first_terminal_transition() {
        let mut state = SessionState::new();
        state.apply(Command::Start).unwrap();
        let first = state.apply(Command::Cancel).unwrap();
        let second = state.apply(Command::Cancel).unwrap();

        assert_eq!(state.status(), &SessionStatus::Cancelled);
        assert_eq!(first.kind, EventKind::Cancelled);
        assert_eq!(second.kind, EventKind::CancelIgnored);
        assert_eq!(first.sequence + 1, second.sequence);
    }

    #[test]
    fn failed_transition_does_not_consume_a_sequence_or_append_text() {
        let mut state = SessionState::new();
        let error = state
            .apply(Command::TextDelta("before start".into()))
            .unwrap_err();

        assert!(matches!(
            error,
            TransitionError::InvalidCommand {
                status: SessionStatus::Idle,
                command: "TextDelta"
            }
        ));
        assert_eq!(state.text(), "");
        assert_eq!(state.next_sequence(), 1);
    }

    #[test]
    fn an_open_tool_blocks_finish_until_it_is_closed() {
        let mut state = SessionState::new();
        state.apply(Command::Start).unwrap();
        state.apply(Command::ToolStarted("tool-1".into())).unwrap();

        assert!(matches!(
            state.apply(Command::Finish),
            Err(TransitionError::OpenWork { tools: 1, .. })
        ));

        state.apply(Command::ToolFinished("tool-1".into())).unwrap();
        state.apply(Command::Finish).unwrap();
        assert_eq!(state.status(), &SessionStatus::Completed);
    }
}
