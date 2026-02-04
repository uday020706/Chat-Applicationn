import { useEffect, useState } from "react";
import { auth } from "./firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ChatDashboard from "./pages/ChatDashboard";
import Loader from "./components/Loader";


export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  //  Register page should show first
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setLoading(false); //  Firebase finished checking
  });

  return () => unsubscribe();
}, []);
if (loading) {
  return <Loader />;
}

  if (user) {
    return <ChatDashboard />;
  }


  return (
    <div>
      {showLogin ? <Login /> : <Register />}

      <p className="text-center mt-4">
        {showLogin ? "New user?" : "Already have an account?"}

        <button
          className="ml-2 text-green-600 font-semibold"
          onClick={() => setShowLogin(!showLogin)}
        >
          {showLogin ? "Register" : "Login"}
        </button>
      </p>
    </div>
  );
}
