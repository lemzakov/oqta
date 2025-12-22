import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = search
      ? {
          OR: [
            { name: { contains: String(search), mode: 'insensitive' } },
            { email: { contains: String(search), mode: 'insensitive' } },
            { phone: { contains: String(search), mode: 'insensitive' } },
            { company: { contains: String(search), mode: 'insensitive' } },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: where as any,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { sessions: true, invoices: true },
          },
        },
      }),
      prisma.customer.count({ where: where as any }),
    ]);

    res.json({
      customers,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

export const getCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { linkedAt: 'desc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, company, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        company,
        notes,
      },
    });

    res.json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, notes } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        company,
        notes,
      },
    });

    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.customer.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

export const linkSessionToCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId, sessionId, notes } = req.body;
    const linkedBy = req.user?.id; // From auth middleware

    if (!customerId || !sessionId) {
      return res.status(400).json({ error: 'Customer ID and Session ID are required' });
    }

    const customerSession = await prisma.customerSession.create({
      data: {
        customerId,
        sessionId,
        linkedBy,
        notes,
      },
    });

    res.json(customerSession);
  } catch (error) {
    console.error('Link session error:', error);
    res.status(500).json({ error: 'Failed to link session to customer' });
  }
};

export const unlinkSessionFromCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.customerSession.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Unlink session error:', error);
    res.status(500).json({ error: 'Failed to unlink session from customer' });
  }
};
