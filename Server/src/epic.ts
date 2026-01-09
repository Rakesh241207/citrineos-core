// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { FastifyInstance } from 'fastify';

/**
 * Epic API toolbox scaffold for load management / V2X.
 * Provides basic routes that will call Epic APIs once configured.
 */

interface EpicConfig {
  baseUrl: string;
  apiKey?: string;
}

function getEpicConfig(): EpicConfig {
  return {
    baseUrl: process.env.EPIC_BASE_URL || 'http://localhost:8081/epic',
    apiKey: process.env.EPIC_API_KEY,
  };
}

export function registerEpicRoutes(server: FastifyInstance) {
  const cfg = getEpicConfig();

  server.get('/api/epic/health', async () => ({ status: 'ok', baseUrl: cfg.baseUrl }));

  server.post<{ Body: { siteId: string; setpointKw: number } }>(
    '/api/epic/load-setpoint',
    async (req, reply) => {
      const { siteId, setpointKw } = req.body;
      // TODO: call Epic API with provided setpoint and apiKey
      server.log.info({ siteId, setpointKw }, 'Epic load setpoint request');
      // TODO: map response to dispatcher / smart charging (SetChargingProfile)
      return reply.code(202).send({ status: 'accepted', siteId, setpointKw });
    },
  );
}
