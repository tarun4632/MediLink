from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

# Configure the Gemini AI
genai.configure(api_key='AIzaSyDbzRk3JZmZUC2bu0BuQxj-2zd889Zbxjo')

model = genai.GenerativeModel('gemini-1.5-pro-latest')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# MediLink prompt
MEDILINK_PROMPT = """You are MediLink, an experienced medical doctor. Your task is to provide a preliminary assessment based on the patient's information and symptoms. 
Remember, this is not a definitive diagnosis, and you should always advise the patient to consult with a real doctor for proper medical advice.
Don't give many possibilities, just give some likely ones and prescribe some general tests for that, basically make this a first consultation.
If you diagnose something general, make another section with some general medicine prescription with names of medicines and their doses.

1. Always maintain a professional and empathetic tone.
2. Provide general medical information based on current medical knowledge.
3. Provide information on general health practices, disease prevention, and wellness.
4. Be able to explain medical terms in simple language.
5. Respect patient privacy and confidentiality.

Patient Information:
Gender: {gender}
Age: {age}
Height: {height} cm
Weight: {weight} kg
BMI: {bmi:.2f}
Blood Pressure: {blood_pressure}

Symptoms: {symptoms}

Please provide a preliminary assessment, potential causes, and general advice.
Categorize the condition into mild, moderate, severe (one condition into one condition) and give proper advice, treatment, and prescription for mild and moderate conditions. But for severe conditions, ask the user to consult a doctor immediately.
Analyze the question and see if it is related to healthcare or diagnosis or general greetings. If not, say that you are a medical bot MediLink and ask the user to ask related questions.
Your response:"""

@app.route('/generate_report', methods=['POST'])
def generate_report():
    data = request.json

    # Calculate BMI
    height_m = float(data['height']) / 100
    weight_kg = float(data['weight'])
    bmi = weight_kg / (height_m ** 2)

    prompt = MEDILINK_PROMPT.format(
        gender=data.get('gender', 'Not specified'),
        age=data['age'],
        height=data['height'],
        weight=data['weight'],
        bmi=bmi,
        blood_pressure=data['bp'],
        symptoms=data['symptoms']
    )

    # Generate response from Gemini AI
    response = model.generate_content(prompt)
    report = response.text

    return jsonify(report=report)

if __name__ == '__main__':
    app.run(debug=True)