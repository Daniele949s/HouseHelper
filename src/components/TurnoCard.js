import React from "react";

// NOTA LA "T" MAIUSCOLA QUI SOTTO: TurnoCard, non turnoCard
export default function TurnoCard({ turno }) {

  // Funzione helper per stampare bene le liste
  const formatList = (list) => {
    if (Array.isArray(list)) return list.join(", ");
    return list;
  };

  return (
    <div className="turno-card turno">
      <h3 className="turno-nomi">{formatList(turno.nomi)}</h3>
      
      <section className="turno-data">
        {/* Mostra solo la data, es: 14/05/2024 */}
    🏆  {new Date(turno.data).toLocaleDateString("it-IT", { weekday: 'short', day: 'numeric', month: 'long' })}
      </section>
      
      <p className="turno-orario">
        <strong>Orari:</strong> {formatList(turno.fasciaOraria)} <br/>
        <strong>Luoghi:</strong> {formatList(turno.luoghi)}
      </p>
      
      <p className="turno-procedura">
        <strong>Procedura:</strong> {formatList(turno.procedura)}
      </p>
    </div>
  );
}