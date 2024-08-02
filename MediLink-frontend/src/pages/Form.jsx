import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ReactMarkdown from 'react-markdown';

const FormPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    bp: '',
    symptoms: ''
  });

  const [report, setReport] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('http://127.0.0.1:5000/generate_report', formData)
      .then(response => {
        setReport(response.data.report);
      })
      .catch(error => {
        console.error('There was an error submitting the form!', error);
      });
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-500 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-900 mb-2">MediLink</h1>
            <h2 className="text-2xl font-bold text-gray-800">Patient Diagnosis</h2>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-gray-700 font-semibold mb-2" htmlFor="name">
                Name
              </label>
              <input
                className="w-full p-2 border border-gray-300 rounded"
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2" htmlFor="age">
                Age
              </label>
              <input
                className="w-full p-2 border border-gray-300 rounded"
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter your age"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2" htmlFor="height">
                Height (cm)
              </label>
              <input
                className="w-full p-2 border border-gray-300 rounded"
                type="number"
                id="height"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="Enter your height in cm"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2" htmlFor="weight">
                Weight (kg)
              </label>
              <input
                className="w-full p-2 border border-gray-300 rounded"
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="Enter your weight in kg"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2" htmlFor="bp">
                Blood Pressure
              </label>
              <input
                className="w-full p-2 border border-gray-300 rounded"
                type="text"
                id="bp"
                name="bp"
                value={formData.bp}
                onChange={handleChange}
                placeholder="Enter your Blood Pressure (e.g., 120/80)"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2" htmlFor="symptoms">
                Symptoms
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded"
                id="symptoms"
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                placeholder="Describe your symptoms"
                rows="4"
              />
            </div>
            <button
              className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded mt-4 hover:bg-blue-700 transition duration-300"
              type="submit"
            >
              Generate Report
            </button>
          </form>
          {report && (
            <div className="mt-8 p-4 bg-green-100 rounded">
              <h3 className="text-xl font-bold mb-2">Diagnosis Report</h3>
              <div className="prose max-w-none">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FormPage;