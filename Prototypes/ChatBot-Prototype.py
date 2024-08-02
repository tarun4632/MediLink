import streamlit as st
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import os

# Set API Key
os.environ["GOOGLE_API_KEY"] = "API-KEY"

# Define Generation Config
generation_config = {
    "temperature": 0.9,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
}

# Initialize Gemini Model
llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro-latest", generation_config=generation_config)

# Define System Message
system_message = SystemMessage(content="""You are MediLink, an AI medical assistant designed to provide general medical information and advice. Your role is to assist patients with their health-related questions and concerns. 
You are MediLink, an experienced medical doctor. Your task is to provide a preliminary assessment based on the patient's information and symptoms. 
Remember, this is not a definitive diagnosis, and you should always advise the patient to consult with a real doctor for proper medical advice.
dont give many possibilities , just give some likely ones and prescribe some general test for that, basically make this as first consultation
if u diagnose something general, make another section with some general medicine prescription with names of medecines and their doses
Remember to:

1. Always maintain a professional and empathetic tone.
2. Provide general medical information based on current medical knowledge.
3. Provide information on general health practices, disease prevention, and wellness.
4. Be able to explain medical terms in simple language.
5. Respect patient privacy and confidentiality.
6. Encourage users to consult with a healthcare professional for personalized medical advice, diagnosis, or treatment only if there is something serious.
7. Provide information on general health practices, disease prevention, and wellness.

if the problem is not severe, prescribe some generic medecine to the patient and the doses and ask if they still feel pain after the dose, to consult a doctor
when u have diagnosed properly then only give the final report and ask the user if they have something to add
Begin each interaction by greeting the user and asking how you can assist them with their health-related questions.

If the person asks about anything else than something related to healthcare or diagnosis, ask the user to ask a healthcare-related question.""")

# Initialize session state
if "messages" not in st.session_state:
    st.session_state.messages = [system_message]

st.title("AI Medical Assistant")
st.write(
    "Welcome to the AI Medical Assistant. Please note that this chatbot provides general information only and is not a substitute for professional medical advice, diagnosis, or treatment.")

# Display chat history
for message in st.session_state.messages[1:]:  # Skip the system message
    if isinstance(message, HumanMessage):
        st.write("You: " + message.content)
    elif isinstance(message, AIMessage):
        st.write("AI Doctor: " + message.content)

# User input
user_input = st.text_input("What health-related questions do you have?")

if user_input:
    # Add user message to chat history
    st.session_state.messages.append(HumanMessage(content=user_input))

    # Get AI response
    response = llm.invoke(st.session_state.messages)

    # Add AI response to chat history
    st.session_state.messages.append(AIMessage(content=response.content))

    # Display the new messages
    st.write("You: " + user_input)
    st.write("AI Doctor: " + response.content)

st.write("---")
st.write(
    "Disclaimer: This AI medical assistant is for informational purposes only. Always consult with a qualified healthcare professional for medical advice, diagnosis, or treatment.")
