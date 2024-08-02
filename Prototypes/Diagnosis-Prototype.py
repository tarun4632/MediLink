import streamlit as st
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
import getpass
import os
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="langchain")

# Set API Key
os.environ["GOOGLE_API_KEY"] = "API-KEY"

# Define Generation Config
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 0,
    "max_output_tokens": 8192,
}

# Initialize Gemini Model
llm = ChatGoogleGenerativeAI(model="gemini-pro", generation_config=generation_config)

# Define Prompt Template
prompt_template = """
You are MediLink, an experienced medical doctor. Your task is to provide a preliminary assessment based on the patient's information and symptoms. 
Remember, this is not a definitive diagnosis, and you should always advise the patient to consult with a real doctor for proper medical advice.
dont give many possibilities , just give some likely ones and prescribe some general test for that, basically make this as first consultation
if u diagnose something general, make another section with some general medicine prescription with names of medecines and their doses

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
categorize teh condition into mild, moderate, severe (one condition into one condition) and give proper advice, treament and prescription and all for mild and moderate conditions but for severe conditions ask the user to consult a doctor immediately
Analyze the question and see if it is related to healthcare or diagnosis or general greetings ... else say that u are a medical bot MediLink and ask user to ask related questions 
Your response:
"""

# Streamlit App
st.title("Medical Chatbot")

# Input Fields
with st.form("patient_info"):
    gender = st.selectbox("gender", ["male", "Female"])
    age = st.number_input("Age", min_value=0, max_value=120, step=1)
    height = st.number_input("Height (cm)", min_value=0.0, max_value=260.0, step=0.1)
    weight = st.number_input("Weight (kg)", min_value=0.0, max_value=650.0, step=0.1)
    blood_pressure = st.text_input("Blood Pressure (e.g., 120/80)")
    symptoms = st.text_area("Describe your symptoms")
    submit_button = st.form_submit_button("Get Assessment")

# Calculate BMI
bmi = weight / ((height / 100) ** 2) if height > 0 else 0

# Run Chain on Submit
if submit_button:
    if age and height and weight and blood_pressure and symptoms:
        response = llm.invoke(input=prompt_template.format(age=age, height=height, weight=weight, bmi=bmi, blood_pressure=blood_pressure, symptoms=symptoms, gender = gender))
        st.subheader("Doctor's Assessment:")
        st.write(response.content)
    else:
        st.warning("Please fill in all the fields.")
