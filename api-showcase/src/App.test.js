import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock global fetch
global.fetch = jest.fn();

describe('App Component Tests', () => {
  beforeEach(() => {
    // Reset the mock before each test
    global.fetch.mockClear();
  });

  test('renders the main heading', () => {
    render(<App />);
    const headingElement = screen.getByText(/API Showcase/i);
    expect(headingElement).toBeInTheDocument();
  });

  test('renders all key UI elements', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/API Endpoint/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument(); // Select is a combobox
    expect(screen.getByPlaceholderText(/Request Body/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Request/i })).toBeInTheDocument();
    expect(screen.getByText(/Response/i)).toBeInTheDocument(); // The <h2>Response</h2> heading
    // The <pre> tag for response content can be identified by its role or lack of explicit label initially
    // For a more robust selector, consider adding a test-id or aria-label to the <pre> tag if needed.
    // For now, we can check if an empty pre tag is there initially, or if its parent div is there.
    const responseDisplay = screen.getByText(/Response/i).closest('div').querySelector('pre');
    expect(responseDisplay).toBeInTheDocument();
  });

  test('simulates a successful GET API call and displays the response', async () => {
    // Mock a successful response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ message: 'Success!' }),
    });

    render(<App />);

    // Get elements
    const endpointInput = screen.getByPlaceholderText(/API Endpoint/i);
    const sendButton = screen.getByRole('button', { name: /Send Request/i });

    // Simulate user input (optional if default value is used, but good for clarity)
    fireEvent.change(endpointInput, { target: { value: 'https://api.example.com/data' } });
    
    // Simulate button click
    fireEvent.click(sendButton);

    // Wait for fetch to be called and state to update
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Check if fetch was called with the correct URL and options
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/data', 
      expect.objectContaining({
        method: 'GET', // Default method
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // Wait for the response to be displayed
    // The response pre tag is identified as before
    const responseDisplay = screen.getByText(/Response/i).closest('div').querySelector('pre');
    await waitFor(() => {
      expect(responseDisplay).toHaveTextContent(/"message": "Success!"/i);
    });
  });

  test('simulates an API call that returns an error and displays the error message', async () => {
    // Mock an error response
    const errorResponse = {
      error: 'Not Found',
      details: 'The requested resource was not found on this server.'
    };
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => (errorResponse),
    });

    render(<App />);

    const sendButton = screen.getByRole('button', { name: /Send Request/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    // Check if the pre tag gets the error class and displays the error
    const responseDisplay = screen.getByText(/Response/i).closest('div').querySelector('pre');
    await waitFor(() => {
      expect(responseDisplay).toHaveClass('error');
      expect(responseDisplay).toHaveTextContent(/Error: 404 Not Found/i);
      expect(responseDisplay).toHaveTextContent(/"error": "Not Found"/i);
    });
  });

  test('simulates a network error during API call and displays the error message', async () => {
    // Mock a network error
    global.fetch.mockRejectedValueOnce(new Error('Network failed'));

    render(<App />);

    const sendButton = screen.getByRole('button', { name: /Send Request/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const responseDisplay = screen.getByText(/Response/i).closest('div').querySelector('pre');
    await waitFor(() => {
      expect(responseDisplay).toHaveClass('error');
      expect(responseDisplay).toHaveTextContent(/Error: Network failed/i);
    });
  });
});
