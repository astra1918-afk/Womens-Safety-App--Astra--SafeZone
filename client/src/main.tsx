import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set the page title
document.title = "Astra - Women's Safety App";

// Add meta description for SEO
const metaDescription = document.createElement("meta");
metaDescription.name = "description";
metaDescription.content =
  "Astra - Comprehensive women's safety app with emergency SOS, voice activation, and community alerts. Stay safe with real-time location sharing and instant emergency responses.";
document.head.appendChild(metaDescription);

// Add Open Graph tags for social sharing
const ogTitle = document.createElement("meta");
ogTitle.setAttribute("property", "og:title");
ogTitle.setAttribute("content", "Astra - Women's Safety App");
document.head.appendChild(ogTitle);

const ogDescription = document.createElement("meta");
ogDescription.setAttribute("property", "og:description");
ogDescription.setAttribute(
  "content",
  "Emergency SOS, voice activation, and community safety features designed for women's protection and peace of mind."
);
document.head.appendChild(ogDescription);

const ogType = document.createElement("meta");
ogType.setAttribute("property", "og:type");
ogType.setAttribute("content", "website");
document.head.appendChild(ogType);

// Render the app
createRoot(document.getElementById("root")!).render(<App />);
