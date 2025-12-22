import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status, customerId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (customerId) {
      where.customerId = customerId;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      invoices,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const getInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { customerId, invoiceNumber, amount, currency, description, dueDate } = req.body;

    if (!invoiceNumber || !amount) {
      return res.status(400).json({ error: 'Invoice number and amount are required' });
    }

    const invoice = await prisma.invoice.create({
      data: {
        customerId,
        invoiceNumber,
        amount,
        currency: currency || 'AED',
        status: 'draft',
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        customer: true,
      },
    });

    res.json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerId, invoiceNumber, amount, currency, description, dueDate, status } = req.body;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        customerId,
        invoiceNumber,
        amount,
        currency,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
      },
      include: {
        customer: true,
      },
    });

    res.json(invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
};

export const sendInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
      include: {
        customer: true,
      },
    });

    // TODO: Implement actual email sending logic here
    // This could integrate with SendGrid, AWS SES, or other email service

    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.invoice.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
};
