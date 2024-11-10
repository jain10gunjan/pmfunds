import axios from "axios";
import { parse } from "node-html-parser";

// Main function to handle the API request
export async function GET(request) {
  const { method } = request;

  // Handle CORS preflight request
  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      status: 204,
    });
  }

  // Extract the target URL parameter
  const url = new URL(request.url);
  const targetParam = decodeURIComponent(url.searchParams.get("url"));

  if (!targetParam) {
    return new Response(
      JSON.stringify({ error: "URL parameter is required" }),
      { status: 400 }
    );
  }

  // Define URLs with placeholders
  const urls = [
    `https://www.chittorgarh.com/ipo-recommendation/${targetParam}`,
    `https://www.chittorgarh.com/ipo_subscription/${targetParam}`,
    `https://www.chittorgarh.com/ipo-hni-funding-cost-calculator/${targetParam}`,
    `https://www.investorgain.com/chr-gmp/${targetParam}`,
    `https://www.chittorgarh.com/ipo_allotment_status/${targetParam}`,
    `https://www.chittorgarh.com/ipo_basis_of_allotment/${targetParam}`,
    `https://www.chittorgarh.com/ipo/${targetParam}`,
  ];

  // Array to store results from each URL fetch
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        // Simulate browser request with headers
        const response = await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36",
          },
        });

        const html = response.data;

        // Parse HTML data based on URL structure
        if (url.includes("ipo_subscription")) {
          const subscriptionData = parseSubscriptionHTML(html);
          const title = extractTitle(html);
          return { url, title, data: subscriptionData };
        } else if (url.includes("ipo-recommendation")) {
          const recommendationData = await parseRecommendationHTML(html);
          const title = extractTitle(html);
          return { url, title, data: recommendationData };
        } else if (url.includes("chr-gmp")) {
          const investorData = await parseInvestorgainHTML(html);
          const title = extractTitle(html);
          return { url, title, data: investorData };
        } else if (url.includes("ipo-hni-funding-cost-calculator")) {
          const investorData = await fetchHniTableData(html);
          const title = extractTitle(html);
          return { url, title, data: investorData };
        } else {
          const title = extractTitle(html);
          return { url, title, data: "Parsed data for non-specific URLs" };
        }
      } catch (error) {
        console.error(`Error fetching data from ${url}:`, error.message);
        return { url, error: "Failed to fetch data" };
      }
    })
  );

  // Return the collected results as JSON with CORS headers
  return new Response(JSON.stringify(results), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Function to extract the title from the HTML
function extractTitle(html) {
  const root = parse(html);
  const titleElement = root.querySelector("title");
  return titleElement ? titleElement.textContent.trim() : "Title not found";
}

// Subscription HTML parsing function
function parseSubscriptionHTML(html) {
  const root = parse(html);

  const subscriptionStatusElement = root.querySelector(
    "div.itemscope h2[itemprop='about']"
  );
  const subscriptionStatus = subscriptionStatusElement
    ? subscriptionStatusElement.textContent.trim()
    : "Status not found";

  const subscriptionTextElement = root.querySelector("div.itemscope p");
  const subscriptionText = subscriptionTextElement
    ? subscriptionTextElement.textContent.trim()
    : "No description found";

  const subscriptionTableRows = root.querySelectorAll(
    ".table-condensed.table-bordered.table-striped.table-nonfluid.table-hover.w-auto tbody tr"
  );

  const subscriptionDetails = subscriptionTableRows.map((row) => {
    const columns = row.querySelectorAll("td");
    return {
      category: columns[0] ? columns[0].textContent.trim() : "N/A",
      subscriptionTimes: columns[1] ? columns[1].textContent.trim() : "N/A",
      sharesOffered: columns[2] ? columns[2].textContent.trim() : "N/A",
      sharesBidFor: columns[3] ? columns[3].textContent.trim() : "N/A",
      totalAmount: columns[4] ? columns[4].textContent.trim() : "N/A",
    };
  });

  return { subscriptionStatus, subscriptionDetails };
}

// Other parsing functions, e.g., parseRecommendationHTML, parseInvestorgainHTML
async function parseRecommendationHTML(html) {
  const root = parse(html);
  const tables = root.querySelectorAll("div.col-md-12");
  const parsedTables = tables.map((table, index) => {
    const rows = table.querySelectorAll("tbody tr");
    const tableData = rows.map((row) =>
      Array.from(row.querySelectorAll("td")).map((col) =>
        col.textContent.trim()
      )
    );
    return { tableIndex: index + 1, tableData };
  });
  return parsedTables;
}

async function parseInvestorgainHTML(html) {
  const root = parse(html);
  const table = root.querySelector("div.table-responsive table");
  const rows = table.querySelectorAll("tbody tr");
  const tableData = rows.map((row) => {
    const columns = row.querySelectorAll("td");
    return {
      gmpDate: columns[0] ? columns[0].textContent.trim() : "N/A",
      ipoPrice: columns[1] ? columns[1].textContent.trim() : "N/A",
      gmp: columns[2] ? columns[2].textContent.trim() : "N/A",
      sub2SaudaRate: columns[3] ? columns[3].textContent.trim() : "N/A",
      estimatedListingPrice: columns[4] ? columns[4].textContent.trim() : "N/A",
      lastUpdated: columns[5] ? columns[5].textContent.trim() : "N/A",
    };
  });
  return tableData;
}

async function fetchHniTableData(html) {
  const root = parse(html);
  const heading = root.querySelector("h3[itemprop='about']").textContent.trim();
  const table = root.querySelector("#hni_table tbody");
  const tableData = Array.from(table.querySelectorAll("tr")).map((row) =>
    Array.from(row.querySelectorAll("td")).map((cell) =>
      cell.textContent.trim()
    )
  );
  const formula = root.querySelector("blockquote").textContent.trim();
  const days = root.querySelector(".spandays").textContent.trim();
  return { heading, tableData, formula, days };
}
