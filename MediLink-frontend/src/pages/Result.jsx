import React from 'react';
import Navbar from '../components/Navbar';

const Result = () => {
  return (
    <>
<Navbar/>
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-500 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">MediLink</h1>
          <h2 className="text-2xl font-bold text-gray-800">Prescription</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Patient Name:
            </label>
            <div className="p-2 border border-gray-300 rounded bg-gray-100">John Doe</div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Age:
            </label>
            <div className="p-2 border border-gray-300 rounded bg-gray-100">30</div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Date:
            </label>
            <div className="p-2 border border-gray-300 rounded bg-gray-100">2024-07-31</div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Medications:
            </label>
            <ul className="p-2 border border-gray-300 rounded bg-gray-100 list-disc list-inside">
              <li>Medicine 1: 1 tablet twice daily</li>
              <li>Medicine 2: 5 ml syrup once daily</li>
              <li>Medicine 3: 1 capsule after lunch</li>
            </ul>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Doctor's Notes:
            </label>
            <div className="p-2 border border-gray-300 rounded bg-gray-100">
              Take medications with food. Follow up in two weeks.
            </div>
          </div>
        </div>
        <button
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded mt-4"
          type="button"
        >
          Print Prescription
        </button>
      </div>
    </div>
    </>
  );
};

export default Result;
