import axios from "axios";
import { parseStringPromise } from "xml2js";
import { JSDOM } from "jsdom"; // Use JSDOM for HTML parsing in place of cheerio

const sitemapUrl = "https://www.moneycontrol.com/news/news-sitemap.xml";
// let previousLink = "any-url.com";

// Fetch and parse the sitemap XML
async function fetchSitemap() {
  try {
    const { data } = await axios.get(sitemapUrl);

    // Parse the XML using xml2js
    const parsedXML = await parseStringPromise(data);
    const urls = parsedXML.urlset.url;

    if (urls && urls.length > 0) {
      const latestUrl = urls[0].loc[0]; // Get the first URL from the sitemap

      //   if (latestUrl === previousLink) {
      //     return { message: "Already fetched the URL", url: latestUrl };
      //   } else {
      //   previousLink = latestUrl;

      // Fetch the article page for content extraction
      const articleData = await fetchArticleContent(latestUrl);
      return { message: "New URL detected", url: latestUrl, articleData };
      //   }
    }
    return { message: "No URLs found in the sitemap" };
  } catch (error) {
    throw new Error("Error fetching sitemap or parsing XML: " + error.message);
  }
}

// Fetch the content of the article URL and extract the desired sections
async function fetchArticleContent(articleUrl) {
  try {
    const { data } = await axios.get(articleUrl);

    // Parse HTML with JSDOM
    const dom = new JSDOM(data);
    const document = dom.window.document;

    // Fetch the title
    const title =
      document.querySelector(".article_title, .artTitle")?.textContent.trim() ||
      "Title not found";

    // Fetch the first article description
    const firstDescription =
      document.querySelector(".article_desc")?.textContent.trim() ||
      "Description not found";

    // Fetch all <p> tags and extract desired paragraphs
    const paragraphs = Array.from(document.querySelectorAll("p"));
    const totalParagraphs = paragraphs.length;

    if (totalParagraphs < 8) {
      return { title, firstDescription, content: "Not enough paragraphs" };
    }

    // Extract paragraphs from the 11th to total - 4
    const extractedParagraphs = paragraphs
      .slice(11, totalParagraphs - 4)
      .map((p) => p.textContent.trim());

    const thirdArticleText = extractedParagraphs.join("\n\n");

    // Extract the image URL
    const imageUrl =
      document
        .querySelector(".article_image_wrapper .article_image img")
        ?.getAttribute("data-src") || "Image URL not found";

    return {
      title,
      firstDescription,
      content: thirdArticleText,
      imageUrl,
    };
  } catch (error) {
    throw new Error(
      "Error fetching or parsing the article page: " + error.message
    );
  }
}

// Define API route
export async function GET(req) {
  try {
    const result = await fetchSitemap();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
