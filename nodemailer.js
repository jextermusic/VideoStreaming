const nodemailer = require("nodemailer");
const googleApis = require("googleapis");

const REDIRECT_URI = `https://developers.google.com/oauthplayground`;
const CLIENT_ID = `865795165018-v6eplk72rrphj2oh2o2qguci1hbqjlln.apps.googleusercontent.com`;
const CLIENT_SECRET = `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`;
const REFRESH_TOKEN = `1//04b6U2Xo-D3KFCgYIARAAGAQSNwF-L9IrRrMvJ25aiCQdZ_XtvyckB8JMzgm89CA7gYOC6lgEcZR_6-ZrM23bVaCpkPYiUsWRsq8`;

const authClient = new googleApis.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
authClient.setCredentials({refresh_token: REFRESH_TOKEN});


async function mailer(email, otp){
    try{
        const ACCESS_TOKEN = await authClient.getAccessToken();

        const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: "djchiragthebest20@gmail.com",
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: ACCESS_TOKEN
            }
        })

        const details = {
            from: "Stormshare <djchiragthebest20@gmail.com>",
            to: email,
            subject: "Verification",
            text: `Here if your OTP:${otp}`,
            html: ` <h2>Here if your OTP:${otp}</h2>`
        }

        const result =  await transport.sendMail(details);
        return result;

    }
    catch(err){
        return err;
    }
}

// mailer().then(res => {
//     console.log("sent mail !", res);
// })

module.exports = mailer;