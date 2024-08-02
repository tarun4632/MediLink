import os
import chainlit as cl
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

# Set API Key
os.environ["GOOGLE_API_KEY"] = "GOOGLE_API_KEY"

# Define Generation Config
generation_config = {
    "temperature": 0.9,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
}

# Initialize MediLink Model
llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro-latest", generation_config=generation_config)

# Define System Message
system_message = SystemMessage(content="""You are MediLink, an AI medical assistant designed to provide general medical information and advice. Your role is to assist patients with their health-related questions and concerns. 
You are MediLink, an experienced medical doctor. Your task is to provide a preliminary assessment based on the patient's information and symptoms. 

process - 
0. start by asking if the user is ready or not 
1. Ask the user - gender, age, height, weight, bmi, blood_pressure, symptoms
2. after asking this .. generate a tabular report about these things confirming if the user have inputted everything correct if not change it 
3. then ask for the symptoms and then give a diagnosis based on the symptoms and the data provided by the user.

don't give many possibilities, just give some likely ones and prescribe some general test for that, basically make this as first consultation
If you diagnose something general, make another section with some general medicine prescription with names of medicines and their doses
Remember to:

1. Always maintain a professional and empathetic tone.
2. Provide general medical information based on current medical knowledge.
3. Provide information on general health practices, disease prevention, and wellness.
4. Be able to explain medical terms in simple language.
5. Respect patient privacy and confidentiality.
6. Encourage users to consult with a healthcare professional for personalized medical advice, diagnosis, or treatment only if there is something serious.
7. Provide information on general health practices, disease prevention, and wellness.

If the problem is not severe, prescribe some generic medicine to the patient and the doses and ask if they still feel pain after the dose, to consult a doctor
When you have diagnosed properly then only give the final report and ask the user if they have something to add
Begin each interaction by greeting the user and asking how you can assist them with their health-related questions.

If the person asks about anything else than something related to healthcare or diagnosis, ask the user to ask a healthcare-related question.""")


@cl.on_chat_start
async def start():
    cl.user_session.set("messages", [system_message])

    # Create sidebar inputs
    await cl.Message(content="Please provide the following information:").send()

    gender = await cl.AskUserMessage(content="What is your gender? (Male/Female/Other)", timeout=30).send()
    age = await cl.AskUserMessage(content="What is your age?", timeout=30).send()
    height = await cl.AskUserMessage(content="What is your height (in cm)?", timeout=30).send()
    weight = await cl.AskUserMessage(content="What is your weight (in kg)?", timeout=30).send()
    bmi = await cl.AskUserMessage(content="What is your BMI? (If you don't know, enter 'Unknown')", timeout=30).send()
    blood_pressure = await cl.AskUserMessage(content="What is your blood pressure? (e.g., 120/80)", timeout=30).send()

    # Store user inputs in session
    cl.user_session.set("patient_info", {
        "gender": gender,
        "age": age,
        "height": height,
        "weight": weight,
        "bmi": bmi,
        "blood_pressure": blood_pressure
    })

    await cl.Message(
        content="Thank you for providing your information. How can I assist you with your health-related questions?").send()


@cl.on_message
async def main(message: cl.Message):
    messages = cl.user_session.get("messages")
    patient_info = cl.user_session.get("patient_info")

    if messages is None:
        messages = [system_message]

    if patient_info:
        # Append patient info to the message if it's the first user message
        if len(messages) == 1:  # Only system message is present
            patient_info_str = "\n".join([f"{k}: {v}" for k, v in patient_info.items() if v])
            message.content = f"Patient Information:\n{patient_info_str}\n\nUser Message: {message.content}"

    messages.append(HumanMessage(content=message.content))

    response = await cl.make_async(llm.invoke)(messages)
    messages.append(AIMessage(content=response.content))

    cl.user_session.set("messages", messages)

    await cl.Message(content=response.content).send()


@cl.on_chat_end
async def end():
    await cl.Message(
        content="Thank you for using the AI Medical Assistant. Remember, this service is for informational purposes only. Always consult with a qualified healthcare professional for medical advice, diagnosis, or treatment.").send()


if __name__ == "__main__":
    cl.run()
