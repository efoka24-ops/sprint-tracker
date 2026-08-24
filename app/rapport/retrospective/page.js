'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Statut from '@/components/Statut'

export default function RetrospectivePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sprintId = searchParams.get('sprintId')

  const [sprint, setSprint] = useState(null)
  const [retrospective, setRetrospective] = useState(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    bilan: '',
    pointsForts: '',
    pointsFaibles: '',
    ameliorations: ''
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!sprintId) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        // Récupérer le sprint
        const sprintRes = await fetch(`/api/sprints/${sprintId}`)
        if (!sprintRes.ok) throw new Error('Sprint non trouvé')
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
  }, [sprintId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      const res = await fetch('/api/retrospectives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprintId,
          ...formData
        })
      })

      if (!res.ok) throw new Error('Erreur lors de la sauvegarde')

      const data = await res.json()
      setRetrospective(data)
      setEditing(false)
      setMessage('Rétrospective sauvegardée ✓')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Erreur:', err)
      setMessage('Erreur lors de la sauvegarde')
    }
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
        <h2>Aperçu du Sprint</h2>
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
      <section style={{ marginBottom: '30px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #eee' }}>
        <h2>Bilan Global</h2>
        {editing ? (
          <textarea
            name="bilan"
            value={formData.bilan}
            onChange={handleChange}
            placeholder="Résumé global du sprint"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <p style={{ whiteSpace: 'pre-wrap', color: retrospective?.bilan ? '#111' : '#999' }}>
            {retrospective?.bilan || 'Aucun bilan pour le moment'}
          </p>
        )}
      </section>

      {/* Points forts */}
      <section style={{ marginBottom: '30px', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
        <h2 style={{ color: '#16a34a' }}>Points Forts</h2>
        {editing ? (
          <textarea
            name="pointsForts"
            value={formData.pointsForts}
            onChange={handleChange}
            placeholder="Ce qui a bien marché"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <p style={{ whiteSpace: 'pre-wrap', color: retrospective?.pointsForts ? '#111' : '#999' }}>
            {retrospective?.pointsForts || 'À remplir'}
          </p>
        )}
      </section>

      {/* Points à améliorer */}
      <section style={{ marginBottom: '30px', padding: '16px', backgroundColor: '#fef2f2', borderRadius: '4px', border: '1px solid #fecaca' }}>
        <h2 style={{ color: '#dc2626' }}>Points à Améliorer</h2>
        {editing ? (
          <textarea
            name="pointsFaibles"
            value={formData.pointsFaibles}
            onChange={handleChange}
            placeholder="Ce qui n'a pas marché, ce qui peut être amélioré"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <p style={{ whiteSpace: 'pre-wrap', color: retrospective?.pointsFaibles ? '#111' : '#999' }}>
            {retrospective?.pointsFaibles || 'À remplir'}
          </p>
        )}
      </section>

      {/* Améliorations pour le prochain sprint */}
      <section style={{ marginBottom: '30px', padding: '16px', backgroundColor: '#fefce8', borderRadius: '4px', border: '1px solid #fde047' }}>
        <h2 style={{ color: '#ca8a04' }}>Améliorations pour le Prochain Sprint</h2>
        {editing ? (
          <textarea
            name="ameliorations"
            value={formData.ameliorations}
            onChange={handleChange}
            placeholder="Actions et améliorations à mettre en place"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <p style={{ whiteSpace: 'pre-wrap', color: retrospective?.ameliorations ? '#111' : '#999' }}>
            {retrospective?.ameliorations || 'À remplir'}
          </p>
        )}
      </section>

      {/* Boutons d'édition */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
        {editing ? (
          <>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Enregistrer
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setFormData({
                  bilan: retrospective?.bilan || '',
                  pointsForts: retrospective?.pointsForts || '',
                  pointsFaibles: retrospective?.pointsFaibles || '',
                  ameliorations: retrospective?.ameliorations || ''
                })
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#e5e7eb',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#FF7900',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Éditer
          </button>
        )}
      </div>

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
