import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
} from '@mui/material';
import PredictionUpload from '../Prediction/PredictionUpload';

const categoryTitles = {
  general: 'General Dashboard',
  defence: 'Defence GNSS Dashboard',
  aviation: 'Aviation GNSS Dashboard',
  telecommunication: 'Telecommunication GNSS Dashboard',
};

const categoryDescriptions = {
  general: 'Overview of global GNSS error forecasting and performance metrics',
  defence: 'Specialized GNSS tracking and error analysis for defence operations',
  aviation: 'Aviation-specific GNSS error monitoring and flight safety analytics',
  telecommunication: 'Telecommunication network timing and synchronization metrics',
};

function Dashboard() {
  const { type } = useParams();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          {categoryTitles[type]}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {categoryDescriptions[type]}
        </Typography>
      </Box>

      {/* CSV Upload Section - Shows predictions only after processing */}
      <Box sx={{ mb: 4 }}>
        <PredictionUpload />
      </Box>
    </Box>
  );
}

export default Dashboard;
