'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import Statut from '@/components/Statut'

export default function RetrospectivePage() {
  return (
    <Suspense fallback={<div className="p4">Chargement...</div>}>
      <Retrospective />
    </Suspense>
  )
}

function Retrospective() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sprintId = searchParams.get('sprintId')

  const [sprint, setSprint] = useState(null)
  const [retrospective, setRetrospective] = useState(null)
  const [editingSection, setEditingSection] = useState(null) // 'bilan', 'pointsForts', 'pointsFaibles', 'ameliorations'
  const [formData, setFormData] = useState({
    bilan: '',
    pointsForts: '',
    pointsFaibles: '',
    ameliorations: ''
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Vérifier l'authentification
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth')
        if (res.ok) {
          const data = await res.json()
          if (data.utilisateur) {
            setIsAuthenticated(true)
          } else {
            router.push('/connexion')
            return
          }
        } else {
          router.push('/connexion')
          return
        }
      } catch (err) {
        console.error('Erreur authentification:', err)
        router.push('/connexion')
      }
    }
    
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!sprintId || !isAuthenticated) {
      if (sprintId) setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        // Récupérer le sprint
        const sprintRes = await fetch(`/api/sprints/${sprintId}`)
        if (!sprintRes.ok) {
          if (sprintRes.status === 401) {
            router.push('/connexion')
            return
          }
          throw new Error('Sprint non trouvé')
        }
        const sprintData = await sprintRes.json()
        setSprint(sprintData)

        // Récupérer la rétrospective
        try {
          const retroRes = await fetch(`/api/retrospectives?sprintId=${sprintId}`)
          if (retroRes.ok) {
            const retroData = await retroRes.json()
            setRetrospective(retroData)
            setFormData({
              bilan: retroData.bilan || '',
              pointsForts: retroData.pointsForts || '',
              pointsFaibles: retroData.pointsFaibles || '',
              ameliorations: retroData.ameliorations || ''
            })
          } else {
            // Créer une rétrospective vide
            const newRetro = await fetch('/api/retrospectives', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sprintId })
            })
            if (newRetro.ok) {
              const data = await newRetro.json()
              setRetrospective(data)
            }
          }
        } catch (err) {
          console.error('Erreur lors de la récupération de la rétrospective', err)
        }
      } catch (err) {
        console.error('Erreur:', err)
        setMessage('Erreur lors du chargement du sprint')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [sprintId, isAuthenticated, router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async (section) => {
    try {
      const res = await fetch('/api/retrospectives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprintId,
          [section]: formData[section]
        })
      })

      if (!res.ok) throw new Error('Erreur lors de la sauvegarde')

      const data = await res.json()
      setRetrospective(data)
      setEditingSection(null)
      setMessage(`${section} sauvegardé ✓`)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Erreur:', err)
      setMessage('Erreur lors de la sauvegarde')
    }
  }

  const handleCancel = (section) => {
    setFormData(prev => ({
      ...prev,
      [section]: retrospective?.[section] || ''
    }))
    setEditingSection(null)
  }

  const SectionEditable = ({ title, section, bgColor, titleColor, icon, placeholder }) => {
    const isEditing = editingSection === section
    const content = retrospective?.[section] || ''
    const isEmpty = !content || content.trim() === ''

    return (
      <section style={{ marginBottom: '30px', padding: '16px', backgroundColor: bgColor, borderRadius: '4px', border: `1px solid ${titleColor}20` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: titleColor, margin: 0 }}>{icon} {title}</h2>
          {!isEditing && (
            <button
              onClick={() => setEditingSection(section)}
              style={{
                padding: '6px 12px',
                backgroundColor: titleColor,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
            >
              ✎ Éditer
            </button>
          )}
        </div>

        {isEditing ? (
          <>
            <textarea
              name={section}
              value={formData[section]}
              onChange={handleChange}
              placeholder={placeholder}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '8px',
                marginTop: '12px',
                marginBottom: '12px',
                borderRadius: '4px',
                border: `1px solid ${titleColor}`,
                fontFamily: 'inherit'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleSave(section)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: titleColor,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✓ Enregistrer
              </button>
              <button
                onClick={() => handleCancel(section)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e5e7eb',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
            </div>
          </>
        ) : (
          <p style={{
            whiteSpace: 'pre-wrap',
            color: isEmpty ? '#999' : '#111',
            marginTop: '12px',
            lineHeight: '1.6'
          }}>
            {isEmpty ? 'À remplir' : content}
          </p>
        )}
      </section>
    )
  }

  if (loading) {
    return <div className="p4">Chargement...</div>
  }

  if (!sprint) {
    return <div className="p4">Sprint non trouvé</div>
  }

  if (!sprint.cloture) {
    return (
      <div className="p4">
        <h1>Rétrospective - {sprint.libelle}</h1>
        <p style={{ color: '#FF7900' }}>Ce sprint n'est pas encore clôturé. La rétrospective sera disponible après la clôture.</p>
      </div>
    )
  }

  return (
    <div className="p4">
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => router.back()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Retour
        </button>
      </div>

      <h1>Rétrospective du Sprint</h1>

      {/* Aperçu du sprint */}
      <section style={{ marginBottom: '30px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #eee' }}>
        <h2>📊 Aperçu du Sprint</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <strong>Sprint:</strong> {sprint.libelle}
          </div>
          <div>
            <strong>Période:</strong> {new Date(sprint.dateDebut).toLocaleDateString('fr-FR')} → {new Date(sprint.dateFin).toLocaleDateString('fr-FR')}
          </div>
          <div>
            <strong>Durée:</strong> {sprint.nbSemaines} semaine{sprint.nbSemaines > 1 ? 's' : ''}
          </div>
          <div>
            <strong>Statut:</strong> <Statut statut={sprint.cloture ? 'LIVRE' : 'VALIDE'} />
          </div>
          <div>
            <strong>Capacité:</strong> {sprint.capaciteTotale}h
          </div>
        </div>
      </section>

      {/* Bilan global */}
      <SectionEditable
        title="Bilan Global"
        section="bilan"
        bgColor="#f9f9f9"
        titleColor="#111"
        icon="📋"
        placeholder="Résumé global du sprint"
      />

      {/* Points forts */}
      <SectionEditable
        title="Points Forts"
        section="pointsForts"
        bgColor="#f0fdf4"
        titleColor="#16a34a"
        icon="✓"
        placeholder="Ce qui a bien marché"
      />

      {/* Points à améliorer */}
      <SectionEditable
        title="Points à Améliorer"
        section="pointsFaibles"
        bgColor="#fef2f2"
        titleColor="#dc2626"
        icon="⚠"
        placeholder="Ce qui n'a pas marché, ce qui peut être amélioré"
      />

      {/* Améliorations pour le prochain sprint */}
      <SectionEditable
        title="Améliorations pour le Prochain Sprint"
        section="ameliorations"
        bgColor="#fefce8"
        titleColor="#ca8a04"
        icon="→"
        placeholder="Actions et améliorations à mettre en place"
      />

      {message && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: message.includes('Erreur') ? '#fee' : '#efe',
          color: message.includes('Erreur') ? '#c33' : '#3c3',
          borderRadius: '4px',
          borderLeft: '4px solid ' + (message.includes('Erreur') ? '#c33' : '#3c3')
        }}>
          {message}
        </div>
      )}
    </div>
  )
}
