import axios from "axios";
import { parse } from "node-html-parser";

// Main function to handle the API request
export async function GET(request) {
  const url = new URL(request.url);
  const targetParam = decodeURIComponent(url.searchParams.get("url"));

  if (!targetParam) {
    return new Response(
      JSON.stringify({ error: "URL parameter is required" }),
      { status: 400 }
    );
  }

  // Base URLs with a placeholder for the {url} parameter
  const urls = [
    `https://www.chittorgarh.com/ipo-recommendation/${targetParam}`, //
    `https://www.chittorgarh.com/ipo_subscription/${targetParam}`, //
    `https://www.chittorgarh.com/ipo-hni-funding-cost-calculator/${targetParam}`, //
    `https://www.investorgain.com/chr-gmp/${targetParam}`, //
    `https://www.chittorgarh.com/ipo_allotment_status/${targetParam}`,
    `https://www.chittorgarh.com/ipo_basis_of_allotment/${targetParam}`,
    `https://www.chittorgarh.com/ipo/${targetParam}`, //
  ];

  // Array to store results from each URL fetch
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        // Add headers to simulate a browser request
        const response = await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36",
          },
        });

        const html = response.data;

        if (
          url === `https://www.chittorgarh.com/ipo_subscription/${targetParam}`
        ) {
          const subscriptionData = parseSubscriptionHTML(html);
          const title = extractTitle(html);

          return {
            url,
            title,
            data: subscriptionData,
          };
        } else if (
          url ===
          `https://www.chittorgarh.com/ipo-recommendation/${targetParam}`
        ) {
          const recommendationData = await parseRecommendationHTML(html);
          const title = extractTitle(html);

          return {
            url,
            title,
            data: recommendationData,
          };
        } else if (
          url === `https://www.investorgain.com/chr-gmp/${targetParam}`
        ) {
          const investorData = await parseInvestorgainHTML(html);
          const title = extractTitle(html);

          return {
            url,
            title,
            data: investorData,
          };
        } else if (url === `https://www.chittorgarh.com/ipo/${targetParam}`) {
          const investorData = await parseIPOAndFinancialDetailsHTML(html);
          const title = extractTitle(html);

          return {
            url,
            title,
            data: investorData,
          };
        } else if (
          url ===
          `https://www.chittorgarh.com/ipo-hni-funding-cost-calculator/${targetParam}`
        ) {
          const investorData = await fetchHniTableData(html);
          const title = extractTitle(html);

          return {
            url,
            title,
            data: investorData,
          };
        } else {
          const title = extractTitle(html);
          return {
            url,
            title,
            data: "Parsed data for non-subscription URLs (if needed)",
          };
        }
      } catch (error) {
        console.error(`Error fetching data from ${url}:`, error.message);
        return {
          url,
          error: "Failed to fetch data",
        };
      }
    })
  );

  // Return the collected results as JSON
  return new Response(JSON.stringify(results), { status: 200 });
}

//HNI
async function fetchHniTableData(html) {
  const root = parse(html);

  // Extract the heading (HNI Cost for X days)
  const heading = root.querySelector("h3[itemprop='about']").textContent.trim();

  // Extract the table data
  const tableData = [];
  const table = root.querySelector("#hni_table tbody");

  const rows = table.querySelectorAll("tr");
  rows.forEach((row) => {
    const rowData = [];
    const cells = row.querySelectorAll("td");

    cells.forEach((cell) => {
      rowData.push(cell.textContent.trim());
    });

    if (rowData.length > 0) {
      tableData.push(rowData);
    }
  });

  // Extract the funding cost formula details
  const formula = root.querySelector("blockquote").textContent.trim();
  const days = root.querySelector(".spandays").textContent.trim();

  return {
    heading,
    tableData,
    formula,
    days,
  };
}

//IPODetails
// Unified function to parse all IPO and financial details from the HTML
async function parseIPOAndFinancialDetailsHTML(html) {
  const root = parse(html);
  const tablesData = [];

  // Select all tables on the page
  const tables = root.querySelectorAll("table");

  // Iterate through each table
  tables.forEach((table) => {
    const tableData = {
      headers: [],
      rows: [],
    };

    // Extract headers
    const headers = table.querySelectorAll("thead th");
    headers.forEach((header) => {
      tableData.headers.push(header.textContent.trim());
    });

    // Extract rows
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      const rowData = [];
      const cells = row.querySelectorAll("td");
      cells.forEach((cell) => {
        rowData.push(cell.textContent.trim());
      });
      if (rowData.length > 0) {
        tableData.rows.push(rowData);
      }
    });

    if (tableData.headers.length > 0 || tableData.rows.length > 0) {
      tablesData.push(tableData);
    }
  });

  return tablesData;
}

//GMP
async function parseInvestorgainHTML(html) {
  const root = parse(html);

  // Selecting the table within the specific div class structure
  const table = root.querySelector("div.table-responsive table");
  const rows = table.querySelectorAll("tbody tr");

  // Initialize an array to store the table data
  const tableData = [];

  rows.forEach((row) => {
    const columns = row.querySelectorAll("td");

    // Extracting text content from each column
    const rowData = {
      gmpDate: columns[0] ? columns[0].textContent.trim() : "N/A",
      ipoPrice: columns[1] ? columns[1].textContent.trim() : "N/A",
      gmp: columns[2] ? columns[2].textContent.trim() : "N/A",
      sub2SaudaRate: columns[3] ? columns[3].textContent.trim() : "N/A",
      estimatedListingPrice: columns[4] ? columns[4].textContent.trim() : "N/A",
      lastUpdated: columns[5] ? columns[5].textContent.trim() : "N/A",
    };

    // Add row data to tableData array
    tableData.push(rowData);
  });

  return tableData;
}

// Function to parse data from each table in the HTML (for IPO Recommendations)
async function parseRecommendationHTML(html) {
  const root = parse(html);

  // Selecting all `div` elements with class `col-md-12`
  const tables = root.querySelectorAll("div.col-md-12");
  const parsedTables = tables
    .map((table, index) => {
      const rows = table.querySelectorAll("tbody tr");
      let tableData = [];

      rows.forEach((row) => {
        const columns = row.querySelectorAll("td");
        // Dynamically extract text content from each column
        const rowData = columns.map((col) => col.textContent.trim());
        if (rowData.some((data) => data !== "")) {
          // Only add rows with non-empty data
          tableData.push(rowData);
        }
      });

      // Only return tables with actual data
      if (tableData.length > 0) {
        return {
          tableIndex: index + 1,
          tableData,
        };
      }
      return null; // Return null for empty tables
    })
    .filter((table) => table !== null); // Filter out null values (empty tables)

  console.log("Parsed Tables:", parsedTables); // Log each table data
  return parsedTables;
}

// Function to parse the subscription page HTML specifically for urls[1]
function parseSubscriptionHTML(html) {
  const root = parse(html); // Parse the HTML

  // Extract Subscription Status
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

  const subscriptionData = {
    status: subscriptionStatus,
    description: subscriptionText,
  };

  // Extract Total Application Data from all <p> tags
  const totalApplicationText = Array.from(root.querySelectorAll("p"))
    .map((p) => p.textContent.trim())
    .find((text) => text.includes("Total Application"));

  // If found, extract the applications and times using regex
  const regex =
    /Total Application\s*:\s*(\d{1,3}(?:,\d{3})*) \(([\d\.]+) times\)/;
  const match = totalApplicationText ? totalApplicationText.match(regex) : null;
  const totalApplications = match
    ? {
        applications: match[1], // e.g., 1,559
        times: match[2], // e.g., 5.20
      }
    : {
        applications: "N/A",
        times: "N/A",
      };

  // Extract the subscription table
  const subscriptionTableRows = root.querySelectorAll(
    ".table-condensed.table-bordered.table-striped.table-nonfluid.table-hover.w-auto tbody tr"
  );

  const subscriptionDetails =
    subscriptionTableRows.length > 0
      ? subscriptionTableRows.map((row) => {
          const columns = row.querySelectorAll("td");
          return {
            category: columns[0] ? columns[0].textContent.trim() : "N/A",
            subscriptionTimes: columns[1]
              ? columns[1].textContent.trim()
              : "N/A",
            sharesOffered: columns[2] ? columns[2].textContent.trim() : "N/A",
            sharesBidFor: columns[3] ? columns[3].textContent.trim() : "N/A",
            totalAmount: columns[4] ? columns[4].textContent.trim() : "N/A",
          };
        })
      : []; // Return an empty array if no rows are found

  // Combine all the extracted data into a structured JSON object
  return {
    subscriptionStatus: subscriptionData,
    subscriptionDetails,
    totalApplications: totalApplications, // Added the new data
  };
}

// Helper function to extract the title from the HTML
function extractTitle(html) {
  const root = parse(html);
  const titleElement = root.querySelector("title");
  return titleElement ? titleElement.textContent.trim() : "Title not found";
}
