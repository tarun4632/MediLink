import React from 'react'
import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom'

const HomePage = () => {
  return (
    <div className='w-[100vw] h-[100vh] overflow-hidden'>
<Navbar/>
    <div className='w-[100vw] h-[100vh] bg-blue-500'>
        <div className="text-center mb-8">
          <h1 className="text-9xl font-bold text-white mb-2">MediLink</h1>
          <h2 className="text-2xl font-bold text-gray-800">Welcome To Your Medical Kiosk</h2>
        </div>
        <ul className=" inter font-[600] flex text-4xl flex-col justify-start items-center text-gray-300 mb-8">
        <div>

          <li className="mb-2  flex items-center">
            <span className="mr-2 text-blue-900 font-bold">✔</span> Get Remote Diagnosis
          </li>
          <li className="mb-2 flex items-center">
            <span className="mr-2 text-blue-900 font-bold">✔</span> Get Generic Substitute Of Medicines
          </li>
          <li className="mb-2 flex items-center">
            <span className="mr-2 text-blue-900 font-bold">✔</span> Get Instantly Connected To Doctors In Cities
          </li>
        </div>
        </ul>
        <div className='text-center text-xl font-bold inter text-black '><Link to={"/login"} className='px-2 py-1 bg-white rounded-md shadow-md'>Login</Link>  to get started</div>
    </div>
    </div>
  )
}

export default HomePage