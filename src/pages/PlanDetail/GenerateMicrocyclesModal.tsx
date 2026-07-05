import { useEffect, useState } from 'react'
import { plansApi } from '../../api/plans'
import './MicrocycleModal.css'
import './GenerateMicrocyclesModal.css'

const MICRO_FOCUS = [
  { value: 'VOLUME',    label: 'Volume' },
  { value: 'INTENSITY', label: 'Intensidade' },
  { value: 'RECOVERY',  label: 'Recuperação' },
  { value: 'TEST',      label: 'Teste' },
]

interface Block {
  weeks: string
  focus: string
}

interface Props {
  open: boolean
  macroId: number | null
  onClose: () => void
  onGenerated: () => void
}

export function GenerateMicrocyclesModal({ open, macroId, onClose, onGenerated }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([{ weeks: '4', focus: 'VOLUME' }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setBlocks([{ weeks: '4', focus: 'VOLUME' }])
  }, [open])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const totalWeeks = blocks.reduce((sum, b) => sum + (Number(b.weeks) || 0), 0)

  const updateBlock = (i: number, field: keyof Block, value: string) =>
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)))
  const addBlock = () => setBlocks((prev) => [...prev, { weeks: '1', focus: 'VOLUME' }])
  const removeBlock = (i: number) => setBlocks((prev) => prev.filter((_, idx) => idx !== i))

  const handleClose = () => { setSaving(false); onClose() }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!macroId || totalWeeks === 0) return
    setSaving(true)
    try {
      await plansApi.generateMicrocycles(macroId, {
        blocks: blocks
          .filter((b) => Number(b.weeks) > 0)
          .map((b) => ({ weeks: Number(b.weeks), focus: b.focus })),
      })
      onClose()
      onGenerated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mim-overlay" onClick={handleClose}>
      <div className="mim-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mim-header">
          <h2 className="mim-title">Gerar semanas automaticamente</h2>
          <button className="mim-close" onClick={handleClose} aria-label="Fechar">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleGenerate} className="mim-form">
          <p className="mim-hint">
            As semanas são criadas em sequência a partir da última já existente (ou do início do macrociclo).
          </p>

          <div className="gmm-blocks">
            {blocks.map((b, i) => (
              <div key={i} className="gmm-block-row">
                <input
                  type="number"
                  className="mim-input gmm-block-weeks"
                  min="1"
                  value={b.weeks}
                  onChange={(e) => updateBlock(i, 'weeks', e.target.value)}
                />
                <span className="gmm-block-label">semana{Number(b.weeks) !== 1 ? 's' : ''} de</span>
                <select
                  className="mim-input mim-select gmm-block-focus"
                  value={b.focus}
                  onChange={(e) => updateBlock(i, 'focus', e.target.value)}
                >
                  {MICRO_FOCUS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="gmm-block-remove"
                  onClick={() => removeBlock(i)}
                  disabled={blocks.length === 1}
                  aria-label="Remover bloco"
                >×</button>
              </div>
            ))}
          </div>

          <button type="button" className="gmm-add-block" onClick={addBlock}>
            + adicionar bloco
          </button>

          <p className="mim-hint">
            Total: <strong>{totalWeeks}</strong> semana{totalWeeks !== 1 ? 's' : ''}
          </p>

          <div className="mim-actions">
            <button type="button" className="mim-btn mim-btn--secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="mim-btn mim-btn--primary" disabled={saving || totalWeeks === 0}>
              {saving ? 'A gerar...' : 'Gerar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
