import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Twitter, Facebook, Linkedin, MessageCircle, Link2, Check, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useTranslation } from 'react-i18next';

/**
 * Reusable share controls: download PDF, email, and social platforms.
 *
 * Props:
 *  - title:     string (required) — used as PDF/share title and email subject
 *  - summary:   string — short text used as the social/email body
 *  - pdf:       { subtitle?, meta?: [{label, value}], paragraphs?: [string], lines?: [{label, value}] }
 *  - url:       string — share URL (defaults to current page)
 *  - fileName:  string — PDF file name (defaults to slug of title)
 *  - compact:   boolean — smaller icon-only buttons
 */
export default function ShareButtons({
  title,
  summary = '',
  pdf,
  url,
  fileName,
  compact = false,
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareText = summary || title;
  const fileBase = (fileName || title || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'document';

  const enc = encodeURIComponent;

  const socials = [
    {
      label: 'X',
      Icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(shareUrl)}`,
      color: 'hover:text-slate-900 hover:bg-slate-100',
    },
    {
      label: 'Facebook',
      Icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`,
      color: 'hover:text-blue-600 hover:bg-blue-50',
    },
    {
      label: 'LinkedIn',
      Icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
      color: 'hover:text-sky-700 hover:bg-sky-50',
    },
    {
      label: 'WhatsApp',
      Icon: MessageCircle,
      href: `https://wa.me/?text=${enc(`${shareText} ${shareUrl}`)}`,
      color: 'hover:text-emerald-600 hover:bg-emerald-50',
    },
  ];

  const emailHref = `mailto:?subject=${enc(title)}&body=${enc(`${shareText}\n\n${shareUrl}`)}`;

  const handlePdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    const titleLines = doc.splitTextToSize(title || '', maxWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 22 + 6;

    if (pdf?.subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text(pdf.subtitle, margin, y);
      y += 18;
    }

    if (pdf?.meta?.length) {
      doc.setFontSize(10);
      pdf.meta.forEach(({ label, value }) => {
        if (value == null || value === '') return;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        const valLines = doc.splitTextToSize(String(value), maxWidth - 90);
        doc.text(valLines, margin + 90, y);
        y += Math.max(14, valLines.length * 13);
      });
      y += 6;
    }

    if (pdf?.paragraphs?.length) {
      pdf.paragraphs.forEach((para) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        const lines = doc.splitTextToSize(para, maxWidth);
        lines.forEach((line) => {
          if (y > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 15;
        });
        y += 8;
      });
    }

    if (pdf?.lines?.length) {
      if (y > doc.internal.pageSize.getHeight() - margin - 40) {
        doc.addPage();
        y = margin;
      }
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(t('share.budgetLines', { defaultValue: 'Budget lines' }), margin, y);
      y += 18;
      pdf.lines.forEach(({ label, value }) => {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        const labelLines = doc.splitTextToSize(label || '', maxWidth - 140);
        doc.text(labelLines, margin, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(String(value ?? '—'), pageWidth - margin, y, { align: 'right' });
        y += Math.max(15, labelLines.length * 13);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y - 4, pageWidth - margin, y - 4);
      });
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${t('share.generatedBy', { defaultValue: 'Generated by Pollee' })} · ${new Date().toLocaleDateString()}`,
        margin,
        doc.internal.pageSize.getHeight() - 20
      );
      doc.text(`${i} / ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
    }

    doc.save(`${fileBase}.pdf`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const renderBtn = (onClick, href, Icon, label, extra) => (
    <Button
      key={label}
      variant="outline"
      size={compact ? 'icon' : 'sm'}
      onClick={onClick}
      asChild={!!href}
      className={compact ? `h-8 w-8 ${extra || ''}` : `h-8 gap-1.5 ${extra || ''}`}
      title={label}
    >
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          <Icon className="w-4 h-4" />
          {!compact && <span>{label}</span>}
        </a>
      ) : (
        <>
          <Icon className="w-4 h-4" />
          {!compact && <span>{label}</span>}
        </>
      )}
    </Button>
  );

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {renderBtn(handlePdf, null, FileText, t('share.downloadPdf', { defaultValue: 'PDF' }))}
      {renderBtn(null, emailHref, Mail, t('share.email', { defaultValue: 'Email' }))}
      {socials.map((s) => renderBtn(null, s.href, s.Icon, s.label, s.color))}
      {renderBtn(handleCopy, null, copied ? Check : Link2, copied ? t('share.copied', { defaultValue: 'Copied' }) : t('share.copyLink', { defaultValue: 'Copy link' }))}
    </div>
  );
}