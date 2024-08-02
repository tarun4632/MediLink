import streamlit as st
from langchain_core.messages.system import SystemMessage
from langchain_core.messages.human import HumanMessage
from langchain_core.messages.ai import AIMessage

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
import os

# Set API Key
os.environ["GOOGLE_API_KEY"] = "API-KEY" # Replace with your actual API key

# Define Generation Config
generation_config = {
    "temperature": 0.9,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
}

# Initialize Gemini Model
llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro-latest", generation_config=generation_config)

# Define System Messages
diagnosis_system_message = """
You are MediLink, an experienced medical doctor. Your task is to provide a preliminary assessment based on the patient's information and symptoms. 
Remember, this is not a definitive diagnosis, and you should always advise the patient to consult with a real doctor for proper medical advice.
Don't give many possibilities, just give some likely ones and prescribe some general tests for that, basically make this as first consultation.
If you diagnose something general, make another section with some general medicine prescription with names of medicines and their doses.

1. Always maintain a professional and empathetic tone.
2. Provide general medical information based on current medical knowledge.
3. Provide information on general health practices, disease prevention, and wellness.
4. Be able to explain medical terms in simple language.
5. Respect patient privacy and confidentiality.

Categorize the condition into mild, moderate, severe (one condition into one category) and give proper advice, treatment and prescription for mild and moderate conditions. For severe conditions, ask the user to consult a doctor immediately.
"""

conversation_system_message = """
You are MediLink, an AI medical assistant designed to provide general medical information and advice. Your role is to assist patients with their health-related questions and concerns. 
Remember to:

1. Always maintain a professional and empathetic tone.
2. Provide general medical information based on current medical knowledge.
3. Provide information on general health practices, disease prevention, and wellness.
4. Be able to explain medical terms in simple language.
5. Respect patient privacy and confidentiality.
6. Encourage users to consult with a healthcare professional for personalized medical advice, diagnosis, or treatment only if there is something serious.
7. Provide information on general health practices, disease prevention, and wellness.

If the problem is not severe, prescribe some generic medicine to the patient and the doses and ask if they still feel pain after the dose, to consult a doctor.
When you have diagnosed properly then only give the final report and ask the user if they have something to add.
Begin each interaction by greeting the user and asking how you can assist them with their health-related questions.

If the person asks about anything else than something related to healthcare or diagnosis, ask the user to ask a healthcare-related question.
"""

# Define Prompt Template for Diagnosis
diagnosis_prompt_template = PromptTemplate(
    input_variables=["gender", "age", "height", "weight", "bmi", "blood_pressure", "symptoms"],
    template=diagnosis_system_message + """
Patient Information:
Gender: {gender}
Age: {age}
Height: {height} cm
Weight: {weight} kg
BMI: {bmi:.2f}
Blood Pressure: {blood_pressure}

Symptoms: {symptoms}

Please provide a preliminary assessment, potential causes, and general advice.
Your response:
"""
)

# Initialize session state
if "page" not in st.session_state:
    st.session_state.page = "diagnosis_form"
if "diagnosis" not in st.session_state:
    st.session_state.diagnosis = None
if "messages" not in st.session_state:
    st.session_state.messages = [HumanMessage(content=conversation_system_message)]


def main():
    st.title("Comprehensive Medical Assistant")

    if st.session_state.page == "diagnosis_form":
        show_diagnosis_form()
    elif st.session_state.page == "diagnosis_result":
        show_diagnosis_result()
    elif st.session_state.page == "conversation":
        show_conversation()


def show_diagnosis_form():
    st.subheader("Initial Diagnosis")
    with st.form("patient_info"):
        gender = st.selectbox("Gender", ["Male", "Female"])
        age = st.number_input("Age", min_value=0, max_value=120, step=1)
        height = st.number_input("Height (cm)", min_value=0.0, max_value=260.0, step=0.1)
        weight = st.number_input("Weight (kg)", min_value=0.0, max_value=650.0, step=0.1)
        blood_pressure = st.text_input("Blood Pressure (e.g., 120/80)")
        symptoms = st.text_area("Describe your symptoms")
        submit_button = st.form_submit_button("Get Assessment")

    if submit_button:
        if age and height and weight and blood_pressure and symptoms:
            bmi = weight / ((height / 100) ** 2) if height > 0 else 0
            diagnosis = generate_diagnosis(gender, age, height, weight, bmi, blood_pressure, symptoms)
            st.session_state.diagnosis = diagnosis
            st.session_state.page = "diagnosis_result"
            st.rerun()
        else:
            st.warning("Please fill in all the fields.")


def generate_diagnosis(gender, age, height, weight, bmi, blood_pressure, symptoms):
    prompt = diagnosis_prompt_template.format(
        gender=gender, age=age, height=height, weight=weight,
        bmi=bmi, blood_pressure=blood_pressure, symptoms=symptoms
    )
    response = llm.invoke(prompt)
    return response.content


def show_diagnosis_result():
    st.subheader("Diagnosis Result")
    st.write(st.session_state.diagnosis)
    if st.button("Continue to Conversation"):
        initialize_conversation_with_diagnosis()
        st.session_state.page = "conversation"
        st.rerun()


def initialize_conversation_with_diagnosis():
    diagnosis_context = f"Initial Diagnosis: {st.session_state.diagnosis}"
    st.session_state.messages = [HumanMessage(content=conversation_system_message)]
    st.session_state.messages.append(HumanMessage(content=diagnosis_context))
    st.session_state.messages.append(AIMessage(
        content="Hello! I've reviewed your initial diagnosis. How can I assist you further with any health-related questions or concerns?"))


def show_conversation():
    st.subheader("Medical Conversation")

    for message in st.session_state.messages[1:]:  # Skip the system message
        if isinstance(message, HumanMessage):
            st.write("You: " + message.content)
        elif isinstance(message, AIMessage):
            st.write("AI Doctor: " + message.content)

    user_input = st.text_input("What health-related questions do you have?")

    if user_input:
        st.session_state.messages.append(HumanMessage(content=user_input))
        with st.spinner("AI is thinking..."):
            response = llm.invoke(st.session_state.messages)
        st.session_state.messages.append(AIMessage(content=response.content))

    if st.button("Start New Diagnosis"):
        st.session_state.page = "diagnosis_form"
        st.session_state.diagnosis = None
        st.session_state.messages = [HumanMessage(content=conversation_system_message)]


if __name__ == "__main__":
    main()
