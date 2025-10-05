import axios from "axios"

const RAPID_API_KEY = process.env.RAPID_API_KEY || "" // keep your key safe in .env

export async function analyzeProduct(productUrl: string) {
  try {
    // Example RapidAPI call (adjust params based on API docs)
    const options = {
      method: "GET",
      url: "https://product-search-api.p.rapidapi.com/search",
      params: {
        q: productUrl, // some APIs accept keyword, some accept URL
        country: "IN",
        language: "en"
      },
      headers: {
        "X-RapidAPI-Key": RAPID_API_KEY,
        "X-RapidAPI-Host": "product-search-api.p.rapidapi.com"
      }
    }

    const response = await axios.request(options)

    // You’ll need to normalize response fields into your analysis structure
    return {
      productName: response.data.products?.[0]?.title || "Unknown Product",
      score: 85, // You can compute this later
      confidence: 90,
      priceComparison: response.data.products || [],
      marketIntelligence: {
        lowestPrice: response.data.products?.[0]?.price,
        highestPrice: response.data.products?.[0]?.price
      }
    }
  } catch (error) {
    console.error("RapidAPI error:", error)
    throw error
  }
}
