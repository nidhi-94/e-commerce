import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, html, attachmentPath = null) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.USER_EMAIL,
                pass: process.env.PASS_EMAIL
            },
        });

        const mailOptions = {
            from: process.env.USER_EMAIL,
            to,
            subject,
            html,
            ...(attachmentPath ? {
                attachments: [
                    {
                        filename: attachmentPath.split("/").pop(),
                        path: attachmentPath
                    }
                ]
            } : {})
        };

        console.log("Sending email to:", to);
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:" + info.response);
        return info;

    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};