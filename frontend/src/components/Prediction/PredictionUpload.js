import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  LinearProgress,
  Alert,
  TextField,
  Grid,
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import { CloudUpload, Download, InsertChart } from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { predictionService } from '../../services/api';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function PredictionUpload() {
  const theme = useTheme();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [predictions, setPredictions] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [processingTime, setProcessingTime] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [params, setParams] = useState({
    n_past_days: 7,
    n_future_days: 1,
    points_per_day: 41,
  });

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError('');
      setSuccess('');
      setPredictions(null);
      setStatistics(null);
      setHistoricalData(null);
      setProcessingTime(null);
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const handleParamChange = (event) => {
    setParams({
      ...params,
      [event.target.name]: parseInt(event.target.value),
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setPredictions(null);
    setStatistics(null);
    setHistoricalData(null);
    setProcessingTime(null);

    try {
      const response = await predictionService.uploadAndPredict(file, params);
      setPredictions(response.data.predictions);
      setStatistics(response.data.statistics);
      setHistoricalData(response.data.historical_data);
      setProcessingTime(response.data.processing_time);
      setSuccess(
        `Predictions Generated Successfully! Processing time: ${response.data.processing_time}s | ${response.data.n_predictions} data points generated`
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!predictions) return;

    const headers = ['utc_time', 'x_error(m)', 'y_error(m)', 'z_error(m)', 'satclockerror(m)'];
    const csvContent = [
      headers.join(','),
      ...predictions.map(pred =>
        headers.map(h => pred[h]).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gnss_predictions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const getChartData = () => {
    if (!predictions || predictions.length === 0) return [];
    return predictions.map(pred => ({
      time: new Date(pred.utc_time).toLocaleTimeString(),
      'X Error': parseFloat(pred['x_error(m)'].toFixed(3)),
      'Y Error': parseFloat(pred['y_error(m)'].toFixed(3)),
      'Z Error': parseFloat(pred['z_error(m)'].toFixed(3)),
      'Clock Error': parseFloat(pred['satclockerror(m)'].toFixed(3)),
    }));
  };

  // Prepare historical chart data
  const getHistoricalChartData = () => {
    if (!historicalData || historicalData.length === 0) return [];
    // Sort by time and reverse to show oldest to newest
    const sorted = [...historicalData].reverse();
    return sorted.map(data => ({
      time: new Date(data.utc_time).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      'X Error': parseFloat(data['x_error(m)'].toFixed(3)),
      'Y Error': parseFloat(data['y_error(m)'].toFixed(3)),
      'Z Error': parseFloat(data['z_error(m)'].toFixed(3)),
      'Clock Error': parseFloat(data['satclockerror(m)'].toFixed(3)),
    }));
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <InsertChart sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" fontWeight="600">
          GNSS Error Prediction & Visualization
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload historical GNSS error data (CSV) to generate future predictions and visualize error trends
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* File Upload Section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                1. Upload CSV File
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Required columns: utc_time, x_error(m), y_error(m), z_error(m), satclockerror(m)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                >
                  Choose CSV File
                  <input
                    type="file"
                    accept=".csv"
                    hidden
                    onChange={handleFileChange}
                  />
                </Button>
                {file && (
                  <Alert severity="info" icon={false}>
                    <Typography variant="body2">
                      <strong>Selected:</strong> {file.name}
                    </Typography>
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                2. Configure Parameters
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Set prediction parameters for the ML models
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    name="n_past_days"
                    label="Past Days"
                    value={params.n_past_days}
                    onChange={handleParamChange}
                    size="small"
                    helperText="Historical data"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    name="n_future_days"
                    label="Future Days"
                    value={params.n_future_days}
                    onChange={handleParamChange}
                    size="small"
                    helperText="Days to predict"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || loading}
          size="large"
          fullWidth
        >
          {loading ? 'Processing with ML Models...' : 'Generate Predictions'}
        </Button>
        {predictions && (
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleDownload}
            size="large"
            fullWidth
          >
            Download CSV
          </Button>
        )}
      </Box>

      {/* Progress Bar */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Running ensemble models (GRU, biGRU, LSTM, biLSTM, Transformer)...
          </Typography>
        </Box>
      )}

      {/* Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Historical Data Chart */}
      {historicalData && historicalData.length > 0 && (
        <Card variant="outlined" sx={{ mt: 3, mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="600">
              Historical Data (Last 2 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={getHistoricalChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis 
                  dataKey="time" 
                  stroke={theme.palette.text.secondary}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke={theme.palette.text.secondary} 
                  label={{ value: 'Error (meters)', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="X Error" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Y Error" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Z Error" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Clock Error" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Predictions Preview Table (before full visualization) */}
      {predictions && predictions.length > 0 && (
        <Card variant="outlined" sx={{ mt: 3, mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="600">
              Predictions Preview
            </Typography>
            <Box sx={{ overflowX: 'auto', mt: 2 }}>
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.palette.action.hover }}>
                    <th style={{ textAlign: 'left', padding: '12px', borderBottom: `2px solid ${theme.palette.divider}` }}>TIME</th>
                    <th style={{ textAlign: 'right', padding: '12px', borderBottom: `2px solid ${theme.palette.divider}` }}>X ERROR (M)</th>
                    <th style={{ textAlign: 'right', padding: '12px', borderBottom: `2px solid ${theme.palette.divider}` }}>Y ERROR (M)</th>
                    <th style={{ textAlign: 'right', padding: '12px', borderBottom: `2px solid ${theme.palette.divider}` }}>Z ERROR (M)</th>
                    <th style={{ textAlign: 'right', padding: '12px', borderBottom: `2px solid ${theme.palette.divider}` }}>CLOCK ERROR (M)</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.slice(0, 5).map((pred, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <td style={{ padding: '12px' }}>
                        {new Date(pred.utc_time).toLocaleString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px' }}>
                        {pred['x_error(m)'].toFixed(3)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px' }}>
                        {pred['y_error(m)'].toFixed(3)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px' }}>
                        {pred['z_error(m)'].toFixed(3)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px' }}>
                        {pred['satclockerror(m)'].toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Prediction Visualizations */}
      {predictions && predictions.length > 0 && (
        <Card variant="outlined" sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="600">
              Predicted GNSS Errors
            </Typography>
            
            {/* Statistics Grid */}
            {statistics && (
              <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ backgroundColor: theme.palette.action.hover }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                        Prediction Statistics
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                        Average Errors
                      </Typography>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="body2">X Error</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" fontWeight="600" color="primary">
                            {statistics.average_errors.x_error.toFixed(3)} m
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">Y Error</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" fontWeight="600" color="primary">
                            {statistics.average_errors.y_error.toFixed(3)} m
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">Z Error</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" fontWeight="600" color="primary">
                            {statistics.average_errors.z_error.toFixed(3)} m
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">Clock Error</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" fontWeight="600" color="primary">
                            {statistics.average_errors.clock_error.toFixed(3)} m
                          </Typography>
                        </Grid>
                      </Grid>

                      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 3 }}>
                        Maximum Errors
                      </Typography>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="body2">Max X</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" fontWeight="600" color="error">
                            {statistics.maximum_errors.max_x.toFixed(3)} m
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">Max Y</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" fontWeight="600" color="error">
                            {statistics.maximum_errors.max_y.toFixed(3)} m
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">Max Z</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" fontWeight="600" color="error">
                            {statistics.maximum_errors.max_z.toFixed(3)} m
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">Max Clock</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" fontWeight="600" color="error">
                            {statistics.maximum_errors.max_clock.toFixed(3)} m
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ backgroundColor: theme.palette.action.hover, height: '100%' }}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography variant="h4" fontWeight="600" color="primary" gutterBottom>
                        {statistics.total_3d_error.toFixed(3)} m
                      </Typography>
                      <Typography variant="h6" color="text.secondary">
                        Total 3D Position Error
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                        Average 3D positioning error calculated from X, Y, and Z error components
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            <Divider sx={{ my: 3 }} />
            
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
              <Tab label="Error Trends" />
              <Tab label="Individual Errors" />
              <Tab label="Data Table" />
            </Tabs>

            {/* Tab 1: Combined Error Trends */}
            <TabPanel value={tabValue} index={0}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Predicted GNSS error trends for all axes
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis 
                    dataKey="time" 
                    stroke={theme.palette.text.secondary}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke={theme.palette.text.secondary} label={{ value: 'Error (m)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="X Error" stroke={theme.palette.error.main} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Y Error" stroke={theme.palette.warning.main} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Z Error" stroke={theme.palette.info.main} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Clock Error" stroke={theme.palette.success.main} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </TabPanel>

            {/* Tab 2: Individual Error Charts */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={2}>
                {['X Error', 'Y Error', 'Z Error', 'Clock Error'].map((errorType) => (
                  <Grid item xs={12} md={6} key={errorType}>
                    <Typography variant="subtitle2" gutterBottom>
                      {errorType}
                    </Typography>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={getChartData()}>
                        <defs>
                          <linearGradient id={`color${errorType.replace(' ', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                        <XAxis dataKey="time" hide />
                        <YAxis stroke={theme.palette.text.secondary} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey={errorType}
                          stroke={theme.palette.primary.main}
                          fillOpacity={1}
                          fill={`url(#color${errorType.replace(' ', '')})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Grid>
                ))}
              </Grid>
            </TabPanel>

            {/* Tab 3: Data Table */}
            <TabPanel value={tabValue} index={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Showing first 10 predictions
              </Typography>
              <Box sx={{ overflowX: 'auto', mt: 2 }}>
                <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: theme.palette.action.hover }}>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: `2px solid ${theme.palette.divider}` }}>Time</th>
                      <th style={{ textAlign: 'right', padding: '12px', borderBottom: `2px solid ${theme.palette.divider}` }}>X Error (m)</th>
                      <th style={{ textAlign: 'right', padding: '12px', borderBottom: `2px solid ${theme.palette.divider}` }}>Y Error (m)</th>
                      <th style={{ textAlign: 'right', padding: '12px', borderBottom: `2px solid ${theme.palette.divider}` }}>Z Error (m)</th>
                      <th style={{ textAlign: 'right', padding: '12px', borderBottom: `2px solid ${theme.palette.divider}` }}>Clock Error (m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.slice(0, 10).map((pred, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <td style={{ padding: '12px' }}>
                          {new Date(pred.utc_time).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>
                          {pred['x_error(m)'].toFixed(4)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>
                          {pred['y_error(m)'].toFixed(4)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>
                          {pred['z_error(m)'].toFixed(4)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>
                          {pred['satclockerror(m)'].toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
              {predictions.length > 10 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  + {predictions.length - 10} more predictions. Download CSV to see all results.
                </Typography>
              )}
            </TabPanel>
          </CardContent>
        </Card>
      )}
    </Paper>
  );
}

export default PredictionUpload;
