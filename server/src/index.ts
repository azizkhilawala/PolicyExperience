import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import labelsRoutes from './routes/labels.js';
import workloadsRoutes from './routes/workloads.js';
import k8sRoutes from './routes/k8s.js';
import policiesRoutes from './routes/policies.js';
import rulesRoutes from './routes/rules.js';
import settingsRoutes from './routes/settings.js';
import resourcesRoutes from './routes/resources.js';
import v2PoliciesRoutes from './routes/v2-policies.js';
import v2TemplatesRoutes from './routes/v2-templates.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/labels', labelsRoutes);
app.use('/api/workloads', workloadsRoutes);
app.use('/api/k8s', k8sRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/policies', rulesRoutes);   // handles /:policyId/rules
app.use('/api/rules', rulesRoutes);      // handles /:id, /:id/duplicate
app.use('/api/tenant-settings', settingsRoutes);
app.use('/api', resourcesRoutes);
app.use('/api/v2', v2PoliciesRoutes);
app.use('/api/v2', v2TemplatesRoutes);

app.listen(PORT, () => {
  console.log(`PolicyExperience API v2 running on http://localhost:${PORT}`);
});
