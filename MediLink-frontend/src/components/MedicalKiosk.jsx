import React from 'react';

const MedicalKiosk = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-500 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
        
        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Patient Details</h3>
          <div className="mb-2">
            <span className="font-bold">Name:</span> <span className="text-gray-700">[Name]</span>
          </div>
          <div className="mb-2">
            <span className="font-bold">Age:</span> <span className="text-gray-700">[Age]</span>
          </div>
          <div className="mb-2">
            <span className="font-bold">Height:</span> <span className="text-gray-700">[Height]</span>
          </div>
          <div className="mb-2">
            <span className="font-bold">Weight:</span> <span className="text-gray-700">[Weight]</span>
          </div>
          <div className="mb-2">
            <span className="font-bold">Address:</span> <span className="text-gray-700">[Address]</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalKiosk;
