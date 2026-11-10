export type LegalSection = {
  title: string;
  body: string;
};

export const DEMO_NOTICE: { title: string; summary: string; sections: LegalSection[] } = {
  title: "Demo Notice",
  summary: "Doyo is a hackathon demo, not a live service.",
  sections: [
    {
      title: "What this is",
      body: "Doyo was built for the PayPal AI Hackathon to show AI agents negotiating and booking home services. No real service is delivered.",
    },
    {
      title: "Workers and customers",
      body: "The other workers and customers you see are simulated, including their offers and messages. Nobody will come to your address.",
    },
    {
      title: "Payments",
      body: "Payments run in the PayPal sandbox, so no real money moves. Do not enter real card or bank details.",
    },
    {
      title: "Your data",
      body: "Do not upload real ID documents; use test images. What you enter is stored on the demo server. Your email is used to send sign-in codes, addresses are looked up with Google, and job details may be processed by Claude.",
    },
    {
      title: "Contact",
      body: "support@letdoyo.com",
    },
  ],
};
