import React, { useState, useEffect } from 'react';
import * as productService from '../services/productService';
import { transformProducts } from '../utils/productUtils';

/**
 * Component để test API List Products
 * Sử dụng để kiểm tra xem API có hoạt động không
 */
const TestListProducts = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    categoryId: '',
    search: ''
  });

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('[TestListProducts] Testing with params:', params);
      
      const requestParams = {
        page: parseInt(params.page) || 1,
        limit: parseInt(params.limit) || 10,
        ...(params.categoryId && { categoryId: parseInt(params.categoryId) }),
        ...(params.search && { search: params.search })
      };

      console.log('[TestListProducts] Request params:', requestParams);

      const startTime = Date.now();
      const response = await productService.listProducts(requestParams);
      const endTime = Date.now();

      console.log('[TestListProducts] Response received:', response);
      console.log('[TestListProducts] Response time:', endTime - startTime, 'ms');

      setResult({
        success: true,
        response: response,
        responseTime: endTime - startTime,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TestListProducts] Error:', err);
      setError({
        message: err.message,
        stack: err.stack,
        name: err.name,
        status: err.status,
        data: err.data
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto test on mount
    testAPI();
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>🧪 Test API: List Products</h2>
      
      <div style={{ 
        background: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>Parameters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div>
            <label>Page: </label>
            <input
              type="number"
              value={params.page}
              onChange={(e) => setParams({ ...params, page: e.target.value })}
              min="1"
              style={{ padding: '5px', width: '100px' }}
            />
          </div>
          <div>
            <label>Limit: </label>
            <input
              type="number"
              value={params.limit}
              onChange={(e) => setParams({ ...params, limit: e.target.value })}
              min="1"
              max="100"
              style={{ padding: '5px', width: '100px' }}
            />
          </div>
          <div>
            <label>Category ID: </label>
            <input
              type="number"
              value={params.categoryId}
              onChange={(e) => setParams({ ...params, categoryId: e.target.value })}
              placeholder="Optional"
              style={{ padding: '5px', width: '150px' }}
            />
          </div>
          <div>
            <label>Search: </label>
            <input
              type="text"
              value={params.search}
              onChange={(e) => setParams({ ...params, search: e.target.value })}
              placeholder="Optional"
              style={{ padding: '5px', width: '200px' }}
            />
          </div>
        </div>
        <button
          onClick={testAPI}
          disabled={loading}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Testing...' : 'Test API'}
        </button>
      </div>

      {loading && (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          color: '#007bff'
        }}>
          ⏳ Đang kiểm tra API...
        </div>
      )}

      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          <h3>❌ Error</h3>
          <pre style={{ 
            background: 'white', 
            padding: '10px', 
            borderRadius: '3px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(error, null, 2)}
          </pre>
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            <strong>Possible issues:</strong>
            <ul>
              <li>Backend server chưa chạy (https://localhost:7051)</li>
              <li>Vite proxy chưa được cấu hình đúng</li>
              <li>CORS error - kiểm tra backend CORS settings</li>
              <li>Network error - kiểm tra kết nối mạng</li>
            </ul>
          </div>
        </div>
      )}

      {result && (
        <div style={{ 
          background: '#d4edda', 
          color: '#155724', 
          padding: '15px', 
          borderRadius: '5px',
          border: '1px solid #c3e6cb'
        }}>
          <h3>✅ Success</h3>
          <div style={{ marginBottom: '10px' }}>
            <strong>Response Time:</strong> {result.responseTime}ms<br />
            <strong>Timestamp:</strong> {result.timestamp}
          </div>
          
          <div style={{ marginTop: '15px' }}>
            <strong>Response Structure:</strong>
            <pre style={{ 
              background: 'white', 
              padding: '10px', 
              borderRadius: '3px',
              overflow: 'auto',
              maxHeight: '400px',
              fontSize: '12px'
            }}>
              {JSON.stringify(result.response, null, 2)}
            </pre>
          </div>

          {result.response && typeof result.response === 'object' && (
            <div style={{ marginTop: '15px' }}>
              <strong>Data Summary:</strong>
              <ul>
                <li>Has totalCount: {result.response.totalCount !== undefined ? '✅' : '❌'}</li>
                <li>Has currentPage: {result.response.currentPage !== undefined ? '✅' : '❌'}</li>
                <li>Has limit: {result.response.limit !== undefined ? '✅' : '❌'}</li>
                <li>Has data array: {Array.isArray(result.response.data) ? '✅' : '❌'}</li>
                {Array.isArray(result.response.data) && (
                  <li>Products count: {result.response.data.length}</li>
                )}
                {result.response.totalCount !== undefined && (
                  <li>Total products: {result.response.totalCount}</li>
                )}
              </ul>
            </div>
          )}

          {result.response && Array.isArray(result.response.data) && result.response.data.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <strong>Sample Product (Original API Format):</strong>
              <pre style={{ 
                background: 'white', 
                padding: '10px', 
                borderRadius: '3px',
                overflow: 'auto',
                maxHeight: '200px',
                fontSize: '12px'
              }}>
                {JSON.stringify(result.response.data[0], null, 2)}
              </pre>
              
              <strong style={{ display: 'block', marginTop: '15px' }}>Sample Product (Transformed Format):</strong>
              <pre style={{ 
                background: '#e7f3ff', 
                padding: '10px', 
                borderRadius: '3px',
                overflow: 'auto',
                maxHeight: '200px',
                fontSize: '12px'
              }}>
                {JSON.stringify(transformProducts([result.response.data[0]])[0], null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: '#e7f3ff', 
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <strong>📝 Notes:</strong>
        <ul>
          <li>Kiểm tra Console (F12) để xem chi tiết request/response</li>
          <li>Response format mong đợi: <code>{`{ success, message, data: { totalCount, currentPage, limit, data: [...] }, errors }`}</code></li>
          <li>Service trả về <code>response.data</code> (object chứa pagination info và array products)</li>
          <li>Components cần truy cập <code>productsData.data</code> để lấy array sản phẩm</li>
        </ul>
      </div>
    </div>
  );
};

export default TestListProducts;

