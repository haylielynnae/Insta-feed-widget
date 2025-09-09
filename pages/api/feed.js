import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Helper function to handle Canva or direct links
function getImageUrl(url) {
  if (!url) return "";
  
  // If it's a Canva link → use Canva's thumbnail preview
  if (url.includes("canva.com")) {
    // Many Canva links work by embedding as an image with /thumbnail
    return `https://canva.com/${url.split("canva.com/")[1]}/thumbnail`;
  }

  // Otherwise return the original (direct JPG, PNG, etc.)
  return url;
}

export default async function handler(req, res) {
  const { databaseId } = req.query;

  if (!databaseId) {
    return res.status(400).json({ error: "Missing databaseId" });
  }

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
    });

    // Sort posts by date (newest first)
    const sortedResults = response.results.sort((a, b) => {
      const dateA = new Date(a.properties["Post Date"]?.date?.start || 0);
      const dateB = new Date(b.properties["Post Date"]?.date?.start || 0);
      return dateB - dateA;
    });

    let html = `
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #fff;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 15px;
            }
            .item {
              position: relative;
              overflow: hidden;
              border-radius: 12px;
              cursor: pointer;
            }
            .item img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
              border-radius: 12px;
              transition: transform 0.3s ease;
            }
            .item:hover img {
              transform: scale(1.05);
            }
            .overlay {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.6);
              color: #fff;
              opacity: 0;
              transition: opacity 0.3s ease;
              display: flex;
              justify-content: center;
              align-items: center;
              text-align: center;
              padding: 15px;
              font-size: 14px;
              border-radius: 12px;
            }
            .overlay-content {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .item:hover .overlay {
              opacity: 1;
            }
            .date {
              font-size: 12px;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="grid">
    `;

    sortedResults.forEach(page => {
      const title = page.properties["Post Title"]?.title?.[0]?.plain_text || "";
      const rawImage = page.properties["Image Link"]?.url || "";
      const image = getImageUrl(rawImage);
      const caption = page.properties["Caption"]?.rich_text?.[0]?.plain_text || "";
      const date = page.properties["Post Date"]?.date?.start || "";

      if (image) {
        html += `
          <div class="item">
            <img src="${image}" alt="${title}" />
            <div class="overlay">
              <div class="overlay-content">
                <div>${caption || ""}</div>
                <div class="date">${date || ""}</div>
              </div>
            </div>
          </div>
        `;
      }
    });

    html += "</div></body></html>";

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
