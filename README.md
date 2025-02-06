# Profitability Calculator Backend

## Overview
This project is a microserver backend designed to calculate the total profitability of a financial position. It processes transactions and returns profitability metrics based on market data and user-defined entries.

## Features
- **Position Management**: Handles entry, addition, partial take-profit, and full closure of financial positions.
- **Real-Time Market Data**: Fetches current prices from an external API.
- **Profitability Calculation**: Computes total profitability, active allocation, and price evolution.
- **REST API**: Accepts HTTP requests for processing financial data.
- **Flexible Configuration**: Environment settings can be customized.

## Technologies Used
- **Node.js**: Backend runtime environment.
- **Express.js**: Web framework for handling API requests.
- **Python (Optional)**: May be used for advanced computations.
- **Axios**: HTTP client for fetching market data.
- **Baserow API**: Used for data storage and retrieval.

## Installation
### Prerequisites
Ensure you have the following installed:
- Node.js (v16+ recommended)
- npm (Node Package Manager)

### Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/profitability-calculator.git
   cd profitability-calculator
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file in the root directory.
   - Add your API keys and configuration settings:
     ```env
     BASEROW_TOKEN=your_baserow_token
     API_KEY_WRITE=your_api_key
     ```

## Usage
### Start the server
Run the following command to launch the backend service:
```sh
node calculator.js
```

### API Endpoints
#### Process Transactions
- **Endpoint**: `/procesar-transacciones`
- **Method**: `POST`
- **Payload Format**:
  ```json
  {
    "tipoPosicion": "corto",
    "precioEntrada": 100,
    "symbol": "AAPL",
    "transacciones": [
      { "tipo": "adicion", "porcentaje": 0.2, "precio": 95 },
      { "tipo": "toma_parcial", "porcentaje": 0.3, "precio": 90 },
      { "tipo": "cierre_total", "precio": 85 }
    ]
  }
  ```
- **Response Format**:
  ```json
  {
    "historial": [...],
    "estadoActual": {
      "precioMercado": "232.47",
      "rentabilidadTotalActiva": "-91.32"
    }
  }
  ```

## Deployment
To deploy in a production environment:
1. Use **PM2** for process management:
   ```sh
   npm install -g pm2
   pm2 start calculator.js --name profitability-calculator
   ```
2. Set up **Reverse Proxy (NGINX)** to expose the API securely.
3. Monitor logs using PM2:
   ```sh
   pm2 logs profitability-calculator
   ```

## Contributing
If you'd like to contribute, please fork the repository and submit a pull request with detailed changes.

## License
This project is licensed under the MIT License.

---
**Author:** Maobits
**Contact:** admin@maobits.com  
**GitHub:** [your-repo](https://github.com/maobits/profitability-calculator)