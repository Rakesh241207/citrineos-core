// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { FastifyInstance } from 'fastify';

/** Minimal OCPI 3.0 PnC/V2G scaffold.
 *  - Provides placeholder routes for OCPI inbound callbacks and outbound proxy
 *  - Ready to be wired to dispatcher and persistence when config is available
 */

export type OcpiRole = 'cpo' | 'emsp' | 'both';

export interface OcpiConfig {
  baseUrl: string;
  tokenCpo?: string;
  tokenEmsp?: string;
  role: OcpiRole;
}

function getOcpiConfig(): OcpiConfig {
  return {
    baseUrl: process.env.OCPI_BASE_URL || 'http://localhost:8080/ocpi',
    tokenCpo: process.env.OCPI_CPO_TOKEN,
    tokenEmsp: process.env.OCPI_EMSP_TOKEN,
    role: (process.env.OCPI_ROLE as OcpiRole) || 'cpo',
  };
}

export function registerOcpi3Routes(server: FastifyInstance) {
  const cfg = getOcpiConfig();

  server.get('/api/ocpi3/health', async () => ({ status: 'ok', role: cfg.role }));

  // Inbound CPO callbacks: sessions, tokens, commands (PnC/V2G)
  server.post<{ Body: any }>('/api/ocpi3/cpo/sessions', async (req, reply) => {
    // TODO: persist session, map to internal session, trigger dispatcher if needed
    server.log.info({ ocpiSession: req.body }, 'OCPI session received');
    return reply.code(202).send({ status: 'accepted' });
  });

  server.post<{ Body: any }>('/api/ocpi3/cpo/tokens', async (req, reply) => {
    // TODO: store token (including PnC cert refs) and link to EVSEs
    server.log.info({ ocpiToken: req.body }, 'OCPI token received');
    return reply.code(202).send({ status: 'accepted' });
  });

  // Outbound EMSP example: fetch tokens (placeholder)
  server.get('/api/ocpi3/emsp/tokens', async () => {
    // TODO: call EMSP hub using cfg.tokenEmsp
    return { status: 'stub', tokens: [] };
  });
}
