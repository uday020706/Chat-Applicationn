import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { storage } from "../firebase/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { io } from "socket.io-client"
import { useEffect, useState } from "react";
import { useRef } from "react";


// connect backend socket 

export default function ChatDashboard() {

  const socketRef = useRef(null);
const BASE_URL = import.meta.env.VITE_BACKEND_URL;

useEffect(() => {
  socketRef.current = io(BASE_URL);

  return () => {
    socketRef.current.disconnect();
  };
}, []);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [currentUsername, setCurrentUsername] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [file, setFile] = useState(null)
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [showNewMsgBtn, setShowNewMsgBtn] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
const notificationSound = useRef(null);

useEffect(() => {
  notificationSound.current = new Audio("/sounds/notify.mp3");
}, []);



  const getChatId = (email1, email2) => {
    return [email1, email2].sort().join("_");
  };

  const chatId = selectedUser
    ? getChatId(auth.currentUser.email, selectedUser.email)
    : "global";

  // receive messages 
  useEffect(() => {
    if (!socketRef.current) return;
    // Load old messages
    const fetchMessages = async () => {
      const res = await fetch(`${BASE_URL}/api/messages/${chatId}`);
      const data = await res.json();
      setMessages(data.map((m) => ({
        sender: m.sender,
        text: m.text,
        fileUrl: m.fileUrl,
        fileType: m.fileType,
        fileName: m.fileName,
        createdAt: m.createdAt

      })));
    };

    fetchMessages();

    socketRef.current.on("receiveMessage", (msg) => {
      //  Only play sound if message is from other user
  if (msg.sender !== currentUsername) {

    //  Play only if chat is not open OR user not at bottom
    if (msg.chatId !== chatId || !isUserAtBottom()) {
notificationSound.current?.play().catch(() => {});
    }
  }
      //  Message belongs to current open chat
      if (msg.chatId === chatId) {
        const shouldScroll = isUserAtBottom();

        setMessages((prev) => [...prev, msg]);

        if (shouldScroll) {
          setTimeout(() => scrollToBottom(), 100);
        } else {
          setShowNewMsgBtn(true);
        }
      }

      // ✅ Message belongs to another chat → increase unread count
      else {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.chatId]: (prev[msg.chatId] || 0) + 1,
        }));
      }
    });

    return () => socketRef.current.off("receiveMessage");
  }, [chatId, currentUsername])

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch(`${BASE_URL}/api/users`);
      const data = await res.json();

      const updated = await Promise.all(
        data.map(async (u) => {
          const id = getChatId(auth.currentUser.email, u.email);

          const msgRes = await fetch(
            `${BASE_URL}/api/messages/last/${id}`
          );

          const lastMsg = await msgRes.json();

          return {
            ...u,
            lastMessage: lastMsg?.text || "",
          };
        })
      );

      setUsers(updated);
    };


    fetchUsers();
  }, []);


  useEffect(() => {
    const fetchMe = async () => {
      const res = await fetch(`${BASE_URL}/api/users`);
      const data = await res.json();

      const me = data.find(
        (u) => u.email === auth.currentUser.email
      );

      if (me) setCurrentUsername(me.username);
    };

    fetchMe();
  }, []);


  useEffect(() => {
    if (currentUsername) {
      socketRef.current.emit("userOnline", currentUsername);
    }
  }, [currentUsername]);

  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => socketRef.current.off("onlineUsers");
  }, []);

  useEffect(() => {
    if (chatId !== "global") {
      socketRef.current.emit("joinRoom", chatId);

      // ✅ Reset unread count when chat opened
      setUnreadCounts((prev) => ({
        ...prev,
        [chatId]: 0,
      }));
    }
  }, [chatId]);




  // send message 
  const sendMessage = async () => {
    if (!selectedUser) return;
    if (!message.trim() && !file) return;

    setSending(true);

    let fileUrl = null;
    let fileType = null;

    if (file) {
      const storageRef = ref(
        storage,
        `chatFiles/${Date.now()}_${file.name}`
      );

      await uploadBytes(storageRef, file);

      fileUrl = await getDownloadURL(storageRef);
      fileType = file.type;

      setFile(null);
      setSelectedFileName("");
    }

    const msgData = {
      chatId,
      sender: currentUsername,
      text: message,
      fileUrl,
      fileType,
      fileName: file ? file.name : null,
      createdAt: new Date().toISOString(),
    };

    socketRef.current.emit("sendMessage", msgData);
    setTimeout(() => {
      scrollToBottom();
    }, 100);
    setShowNewMsgBtn(false);

    setMessage("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setSending(false);
  };

  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.on("showTyping", (user) => {
      //  Prevent showing typing for yourself
      if (user !== currentUsername) {
        setTypingUser(user);
      }
    });

    socketRef.current.on("hideTyping", () => {
      setTypingUser("");
    });

    return () => {
      socketRef.current.off("showTyping");
      socketRef.current.off("hideTyping");
    };
  }, [currentUsername]);

useEffect(() => {
  const unlockAudio = () => {
    notificationSound.current?.play().catch(() => {});
  };

  document.addEventListener("click", unlockAudio, { once: true });

  return () => document.removeEventListener("click", unlockAudio);
}, []);



  // logout 
  const logoutHandler = async () => {
    await signOut(auth);
    alert("Logged out");
  };

  // Date functions 
  // ✅ WhatsApp Style Date Formatter
  const formatWhatsAppDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();

    // ✅ Today
    // ✅ Today
    if (date.toDateString() === now.toDateString()) {
      return "Today";   // ✅ WhatsApp Style
    }


    // ✅ Yesterday
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    // ✅ Older dates
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    if (selectedUser) {
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    }
  }, [selectedUser]);

  const isUserAtBottom = () => {
    const container = document.querySelector("#chatContainer");
    if (!container) return false;

    return (
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + 50
    );
  };

  useEffect(() => {
    const container = document.querySelector("#chatContainer");

    if (!container) return;

    const handleScroll = () => {
      if (isUserAtBottom()) {
        setShowNewMsgBtn(false); // ✅ hide button when user reaches bottom
      }
    };

    container.addEventListener("scroll", handleScroll);

    return () => container.removeEventListener("scroll", handleScroll);
  }, []);



  let typingTimeout;



  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">

      {/* Sidebar */}
      <div
        className={`fixed md:static top-0 left-0 h-full w-full md:w-1/4 
  bg-gray-100 border-r p-4 z-50 transition-transform duration-300
  ${selectedUser ? "-translate-x-full md:translate-x-0" : "translate-x-0"}`}
      >

        <h2
          onClick={() => setSelectedUser(null)}
          className="text-xl font-bold text-green-600 cursor-pointer hover:text-green-800"
        >
          Chat Application
        </h2>


        <p className="mt-2 text-sm text-gray-600">
          Logged in as:
        </p>
        <p className="font-semibold">{auth.currentUser.email}</p>

        <button
          onClick={logoutHandler}
          className="mt-4 w-full bg-red-500 text-white py-2 rounded-xl"
        >
          Logout
        </button>

        <div className="mt-4 space-y-2">
          {users.map((u) => {
            const id = getChatId(auth.currentUser.email, u.email);

            return (
              <div
                key={u._id}
                onClick={() => setSelectedUser(u)}
                className={`p-3 rounded-xl shadow cursor-pointer relative
        ${selectedUser?.email === u.email
                    ? "bg-green-300 font-bold"
                    : "bg-white hover:bg-green-100"
                  }`}
              >
                {/* Username */}
                <p className="font-semibold">{u.email === auth.currentUser.email ? "You" : u.username}</p>

                {/* Last Message */}
                <p className="text-xs text-gray-500 truncate">
                  {u.lastMessage || "No messages yet"}
                </p>

                {/* ✅ Unread Badge */}
                {unreadCounts[id] > 0 && (
                  <span className="absolute top-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCounts[id]}
                  </span>
                )}
              </div>
            );
          })}
        </div>



      </div>

      {/* Chat window */}
      <div
        className={`w-full md:w-3/4 flex flex-col h-screen
  ${selectedUser ? "flex" : "hidden md:flex"}`}
      >


        {/* If no user selected */}
        {!selectedUser ? (
          <div className="flex-1 flex flex-col justify-center items-center bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-600">
              👋 Welcome to Chat Application
            </h2>

            <p className="mt-2 text-gray-500">
              Select a user from the left sidebar to start chatting
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-white font-semibold flex items-center gap-3 
sticky top-0 z-50">
              {/*  Back Button (Mobile Only) */}
              <button
                onClick={() => setSelectedUser(null)}
                className="md:hidden text-xl font-bold text-green-600"
              >
                ←
              </button>
              <div className="flex items-center gap-4">

                <p className="font-semibold">
                  Chat with {selectedUser.username}
                </p>

                <p className="text-sm text-gray-500">
                  {onlineUsers.includes(selectedUser.username)
                    ? "🟢 Online"
                    : "⚪ Offline"}
                </p>
                {typingUser && (
                  <p className="text-sm text-green-600">
                    {typingUser} is typing...
                  </p>
                )}


              </div>
            </div>

            {/* Messages */}
            <div id="chatContainer" className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-3">
              {messages.map((msg, index) => {
                const prevMsg = messages[index - 1];

                //  Show date separator when day changes
                const showDateSeparator =
                  !prevMsg ||
                  new Date(prevMsg.createdAt).toDateString() !==
                  new Date(msg.createdAt).toDateString();

                return (
                  <div key={index}>

                    {/*  WhatsApp Date Separator */}
                    {showDateSeparator && (
                      <div className="text-center my-3">
                        <span className="bg-gray-200 text-gray-600 text-xs px-4 py-1 rounded-full shadow">
                          {formatWhatsAppDate(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* Message Bubble */}

                    <div
                      className={`p-3 rounded-xl w-fit max-w-[75%] break-words ${msg.sender === currentUsername
                        ? "ml-auto bg-green-300"
                        : "bg-white shadow"
                        }`}
                    >

                      {/* Sender */}
                      <p className="text-sm font-bold">
                        {msg.sender === currentUsername ? "You" : msg.sender}
                      </p>

                      {/* Text */}
                      <p>{msg.text}</p>

                      {/*  Image Preview */}
                      {msg.fileUrl && msg.fileType?.startsWith("image") && (
                        <div className="mt-2">
                          <img
                            src={msg.fileUrl}
                            alt="chat-img"
                            onClick={() => setPreviewImage(msg.fileUrl)}
                            className="w-48 h-48 object-cover rounded-2xl cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Document Preview */}
                      {msg.fileUrl && !msg.fileType?.startsWith("image") && (
                        <div
                          onClick={() => window.open(msg.fileUrl, "_blank")}
                          className="mt-2 flex items-center gap-3 bg-gray-200 hover:bg-gray-300 transition p-3 rounded-2xl cursor-pointer max-w-xs"
                        >
                          <div className="text-3xl">
                            {msg.fileType?.includes("pdf") ? "📕" : "📄"}
                          </div>

                          <div className="flex flex-col overflow-hidden">
                            <p className="text-sm font-semibold truncate">
                              {msg.fileName || "Document"}
                            </p>
                            <p className="text-xs text-gray-600">Click to open</p>
                          </div>
                        </div>
                      )}

                      {/* Bubble Time (12hr WhatsApp Style) */}
                      <p className="text-[11px] text-gray-500 mt-1 text-right">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              {/*  WhatsApp New Message Button */}
              {showNewMsgBtn && (
                <button
                  onClick={() => {
                    scrollToBottom();
                    setShowNewMsgBtn(false);
                  }}
                  className="fixed bottom-24 right-10 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-green-700 transition"
                >
                  ⬇ New Messages
                </button>
              )}


              <div ref={messagesEndRef}></div>
            </div>

            {/* Input */}
            <div className="p-2 md:p-4 border-t bg-white flex gap-2 items-center
sticky bottom-0 z-50">

              {/* Attachment Button */}
              <label
                htmlFor="fileUpload"
                className="cursor-pointer bg-gray-200 px-4 py-2 rounded-xl"
              >
                📎
              </label>

              <input
                type="file"
                id="fileUpload"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files[0]);
                  setSelectedFileName(e.target.files[0]?.name);
                }}
              />

              {selectedFileName && (
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  📎 {selectedFileName}
                  <button
                    onClick={() => {
                      setFile(null);
                      setSelectedFileName("");
                    }}
                    className="text-red-500 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              <textarea
                ref={inputRef}
                value={message}
                placeholder="Type a message..."
                rows="1"
                className="flex-1 border rounded-xl px-3 py-2 text-sm md:text-base 
  resize-none overflow-y-auto focus:outline-none"
                style={{ maxHeight: "120px" }}

                onChange={(e) => {
                  setMessage(e.target.value);

                  //  Auto Expand
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 120) + "px";

                  //  Typing event
                  socketRef.current.emit("typing", {
                    chatId,
                    user: currentUsername,
                  });

                  clearTimeout(typingTimeout);
                  typingTimeout = setTimeout(() => {
                    socketRef.current.emit("stopTyping", chatId);
                  }, 1500);
                }}

                //  WhatsApp Feature: Enter Send, Shift+Enter New Line
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault(); // Stop new line
                    sendMessage();      //  Send message
                  }
                }}
              />




              <button
                onClick={sendMessage}
                disabled={sending}
                className={`px-3 py-1.5 md:px-6 rounded-xl text-sm md:text-base text-white ${sending
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
                  }`}
              >
                {sending ? "Sending..." : "Send"}
              </button>

            </div>
          </>
        )}

      </div>
      {/* Fullscreen Image Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="fullscreen"
            className="max-h-[90%] max-w-[90%] rounded-xl shadow-lg"
          />
        </div>
      )}

    </div>
  );
}
