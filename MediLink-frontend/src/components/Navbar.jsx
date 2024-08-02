import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-blue-600 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
        <Link className='flex items-center' to={"/"}>
          <img src="/logo.jpg" alt="Logo" className="h-8 w-8 mr-2" />

          <span className="text-white text-xl font-bold">MediLink</span>
        </Link>
        </div>
        <div className="flex space-x-4">
          <Link to={"/login"} className="text-white font-semibold flex items-center"><span>Login</span></Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
