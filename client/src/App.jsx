import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

function App() {
  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem("chatUser") || "",
  );
  const [authMode, setAuthMode] = useState("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const typingTimerRef = useRef(null);
  let typingTimer;

  const handleMessageChange = (event) => {
    setMessage(event.target.value);

    socket.emit("typing", currentUser);

    clearTimeout(typingTimer);

    typingTimer = setTimeout(() => {
      socket.emit("stop_typing");
    }, 1000);
  };

  const sendMessage = () => {
    if (currentUser.trim() === "" || message.trim() === "") return;

    const messageData = {
      username: currentUser,
      message,
      time: new Date().toLocaleTimeString(),
    };

    socket.emit("send_message", messageData);
    setMessage("");
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setAuthError("");

    if (authUsername.trim() === "" || authPassword.trim() === "") {
      setAuthError("Username and password are required");
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch(`http://localhost:3001/${authMode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: authUsername,
          password: authPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.message || "Something went wrong");
        return;
      }

      localStorage.setItem("chatUser", data.username);
      setCurrentUser(data.username);
      setAuthUsername("");
      setAuthPassword("");
    } catch {
      setAuthError("Could not connect to server");
    } finally {
      setAuthLoading(false);
    }
  };

  const switchAuthMode = () => {
    setAuthMode((mode) => (mode === "login" ? "signup" : "login"));
    setAuthError("");
    setAuthPassword("");
  };

  const logout = () => {
    localStorage.removeItem("chatUser");
    setCurrentUser("");
    setMessages([]);
    setMessage("");
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((previousMessages) => [...previousMessages, data]);
    });

    socket.on("user_typing", (username) => {
      setTypingUser(username);
    });

    socket.on("user_stop_typing", () => {
      setTypingUser("");
    });

    return () => {
      socket.off("receive_message");
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {authMode === "login" ? "Login" : "Create account"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {authMode === "login"
                ? "Welcome back to your chat."
                : "Sign up to start chatting."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="mt-6">
            <label className="text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              type="text"
              placeholder="Enter username"
              value={authUsername}
              onChange={(event) => setAuthUsername(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />

            {authError && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="mt-5 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                  ? "Login"
                  : "Sign up"}
            </button>
          </form>

          <button
            onClick={switchAuthMode}
            className="mt-4 w-full text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {authMode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
        <div className="bg-slate-900 px-5 py-4">
          <h1 className="text-xl font-semibold text-white">Real-Time Chat</h1>
          <p className="text-sm text-slate-300">Socket.IO + React</p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-sm text-slate-600">
              Logged in as{" "}
              <strong className="text-slate-900">{currentUser}</strong>
            </p>

            <button
              onClick={logout}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>

          <div className="mt-4 h-80 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-slate-400 mt-28">
                No messages yet
              </p>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className="mb-3 rounded-md bg-white border border-slate-200 p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-slate-900">
                      {msg.username}
                    </strong>
                    <span className="text-xs text-slate-400">{msg.time}</span>
                  </div>

                  <p className="mt-1 text-sm text-slate-700">{msg.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 h-5">
            {typingUser && typingUser !== currentUser && (
              <p className="text-sm text-slate-500">
                {typingUser} is typing...
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Type a message"
              value={message}
              onChange={handleMessageChange}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendMessage();
                }
              }}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />

            <button
              onClick={sendMessage}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
