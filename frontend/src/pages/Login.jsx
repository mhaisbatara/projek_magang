import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import hero from "../assets/hero.png";
import "./Login.css";

export default function Login() {

    const { login } = useAuth();

    const navigate = useNavigate();

    const [username,setUsername]=useState("");
    const [password,setPassword]=useState("");
    const [show,setShow]=useState(false);
    const [loading,setLoading]=useState(false);
    const [error,setError]=useState("");

    const submit=async(e)=>{

        e.preventDefault();

        setLoading(true);
        setError("");

        try{

            await login(username,password);

            navigate("/dashboard");

        }

        catch(err){

            setError(
                err.response?.data?.message ||
                "Login gagal"
            );

        }

        setLoading(false);

    }

    return(

<div className="login-container">

<div className="login-box">

<div className="login-left">

<h1>Sistem Klinik</h1>

<p>
Silakan login untuk masuk ke sistem
</p>

{
error &&
<div className="error">
{error}
</div>
}

<form onSubmit={submit}>

<input
type="text"
placeholder="Username"
value={username}
onChange={(e)=>setUsername(e.target.value)}
required
/>

<input
type={show?"text":"password"}
placeholder="Password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
required
/>

<label className="remember">

<input
type="checkbox"
onChange={()=>setShow(!show)}
/>

Lihat Password

</label>

<button>

{
loading
?
"Loading..."
:
"LOGIN"
}

</button>

</form>

<div className="register">

Belum punya akun?

<Link to="/register">

Daftar

</Link>

</div>

</div>

<div className="login-right">

<img
src={hero}
alt=""
/>

</div>

</div>

</div>

    )

}