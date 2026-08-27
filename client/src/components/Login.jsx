import React from "react";

export default function Login() {
  function handleSubmit(e) {
    e.preventDefault();
    console.log("submit login form");
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans text-white">
      <div className="bg-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-800">
        {/* Left: Login form */}
        <div className="w-full md:w-1/2 p-8 bg-gray-900">
          <h2 className="text-2xl font-semibold text-white mb-2">Welcome back</h2>
          <p className="text-sm text-gray-300 mb-6">Log in to continue to your student dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm text-gray-300 block mb-1">Email Address</label>
              <input id="email" name="email" type="email" placeholder="you@school.edu" required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
            </div>

            <div>
              <label htmlFor="password" className="text-sm text-gray-300 block mb-1">Password</label>
              <input id="password" name="password" type="password" placeholder="Enter your password" required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <input id="remember" name="remember" type="checkbox" className="h-4 w-4 text-cyan-600 bg-gray-800 border-gray-700 rounded" />
                <label htmlFor="remember" className="text-sm text-gray-300">Remember me</label>
              </div>
              <a href="#" className="text-cyan-400 hover:text-cyan-300">Forgot password?</a>
            </div>

            <div className="space-y-3">
              <button type="button" className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg px-4 py-3">Continue with Google</button>

              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg px-4 py-3">Log in</button>
            </div>
          </form>
        </div>

        {/* Right: Sign up prompt */}
        <div className="w-full md:w-1/2 p-8 bg-gray-950 flex flex-col items-center justify-center text-center">
          <div className="max-w-xs">
            <h3 className="text-xl font-semibold text-white mb-2">New here?</h3>
            <p className="text-sm text-white/80 mb-6">Create an account to book counseling sessions, track your wellness, and get support from counselors.</p>
            <button className="border-2 border-gray-600 hover:border-gray-400 text-white px-8 py-2 rounded-full">Sign up</button>
          </div>
        </div>
      </div>
    </div>
  );
}
