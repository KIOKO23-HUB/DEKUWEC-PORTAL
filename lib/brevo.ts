export async function sendEmail({ 
  to, 
  subject, 
  htmlContent 
}: { 
  to: string; 
  subject: string; 
  htmlContent: string 
}) {
  console.log(`Attempting to send email to: ${to} from: ${process.env.NEXT_PUBLIC_ADMIN_EMAIL}`);
  
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY as string,
      },
      body: JSON.stringify({
        sender: { 
          name: "DEKUWEC Student Executive", 
          email: process.env.NEXT_PUBLIC_ADMIN_EMAIL 
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Brevo API Error Response:", data);
      throw new Error(`Brevo API Error: ${data.message || 'Unknown error'}`);
    }
    
    console.log("Brevo Success Response:", data);
    return data;
  } catch (error) {
    console.error("Failed to send email inside Brevo utility:", error);
    throw error;
  }
}
