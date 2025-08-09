import axios from 'axios';

export default async function GenerateShortUrl(publicUrl: string): Promise<string> {
  try {
    // First, validate the URL
    if (!publicUrl || typeof publicUrl !== 'string') {
      throw new Error('Invalid URL provided');
    }

    // Make the API call with timeout and better error handling
    const response = await axios.post("/api/short-url", 
      { publicUrl }, 
      {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    // Check if response is successful and has expected structure
    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}`);
    }

    if (!response.data) {
      throw new Error("No data returned from server");
    }

    // Handle different possible response structures
    const shortUrl = response.data.shortUrl || response.data.url || response.data;

    if (!shortUrl || typeof shortUrl !== 'string') {
      throw new Error("Invalid short URL format returned from server");
    }

    return shortUrl;

  } catch (error: unknown) {
    console.error("Failed to generate short URL:", error);
    
    // If it's an axios error, provide more specific error info
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;
      
      console.error(`Axios error - Status: ${status}, Message: ${message}`);
      
      throw new Error(`Short URL service error (${status}): ${message}`);
    }
    
    // For non-axios errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error generating short URL: ${errorMessage}`);
  }
}