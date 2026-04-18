import { formatStage } from './utils.js';

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderLessonList(lessons, mountNode) {
  if (!lessons.length) {
    mountNode.innerHTML = '<p class="muted-text">Aucun atelier ne correspond à votre sélection.</p>';
    return;
  }
  mountNode.innerHTML = lessons.map((lesson) => {
    const path = lesson.pathways?.[0];
    return `
      <article class="lesson-row">
        <div class="lesson-row-top">
          <div class="lesson-meta">
            <span class="pill">${esc(formatStage(path?.stage || lesson.currentStage || 'decouverte'))}</span>
            <span class="pill">${lesson.exerciseCount || 0} exercices</span>
            ${lesson.completed ? '<span class="pill done">Validé</span>' : ''}
            ${lesson.locked ? '<span class="pill locked">Verrouillé</span>' : ''}
          </div>
          <span class="muted-text">${esc(lesson.typeLabel || 'Atelier')}</span>
        </div>
        <div class="lesson-row-main">
          <div>
            <h3>${esc(lesson.title)}</h3>
            <p class="muted-text">${esc(lesson.description || lesson.objective || '')}</p>
          </div>
          <div class="text-right">
            <button class="primary-btn" type="button" data-open-lesson="${esc(lesson.id)}" ${lesson.locked ? 'disabled' : ''}>Ouvrir</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

export function renderContinueCard(lesson, pathwayTitle = 'À la carte') {
  if (!lesson) {
    return '<p class="muted-text">Aucun atelier conseillé pour le moment.</p>';
  }
  const path = lesson.pathways?.find((item) => item.id) || lesson.pathways?.[0];
  return `
    <div class="muted-panel">
      <strong>${esc(lesson.title)}</strong>
      <p class="muted-text">${esc(lesson.sessionIntent || lesson.objective || lesson.description || '')}</p>
      <div class="lesson-meta">
        <span class="pill">${esc(pathwayTitle)}</span>
        <span class="pill">${esc(formatStage(path?.stage || 'decouverte'))}</span>
        <span class="pill">${esc(lesson.practice?.duration || '6 à 10 min')}</span>
      </div>
    </div>
  `;
}

function supportCard(track, lessonId) {
  const payload = esc(JSON.stringify(track));
  const showClick = track.type === 'chord_progression';
  return `
    <article class="support-card audio-card" data-support-card="${esc(track.id)}">
      <div>
        <strong>${esc(track.title)}</strong>
        <p class="muted-text">${esc(track.description || '')}</p>
      </div>
      <div class="tempo-row">
        <label>Tempo
          <input type="range" min="40" max="180" value="${Number(track.tempo || 90)}" data-player-tempo />
        </label>
        <span class="tempo-readout">${Number(track.tempo || 90)} BPM</span>
        <label><input type="checkbox" data-player-loop ${track.loopable ? 'checked' : ''} /> Boucle</label>
        ${showClick ? '<label><input type="checkbox" data-player-click checked /> Click</label>' : ''}
      </div>
      <div class="support-toolbar">
        <button class="primary-btn player-button" type="button" data-player-kind="${esc(track.type || 'sequence')}" data-player-payload="${payload}">Lecture</button>
        <button class="secondary-btn" type="button" data-stop-player>Arrêter</button>
      </div>
      <div class="player-progress"><div class="player-progress-fill"></div></div>
    </article>
  `;
}

export function renderLessonModal(lesson, pathways, currentPathwayId = 'all') {
  const selectedPathway = lesson.pathways?.find((p) => p.id === currentPathwayId) || lesson.pathways?.[0];
  const pathTitle = pathways.find((path) => path.id === selectedPathway?.id)?.title || 'À la carte';
  const examples = (lesson.examples || []).map((example) => supportCard({ ...example, type: 'sequence', loopable: true }, lesson.id)).join('');
  const supports = (lesson.supportTracks || []).map((track) => supportCard(track, lesson.id)).join('');
  const practiceSteps = (lesson.practice?.steps || []).map((step) => `<li>${esc(step)}</li>`).join('');
  const keyPoints = (lesson.keyPoints || []).map((point) => `<li><strong>${esc(point.front)}</strong> — ${esc(point.back)}</li>`).join('');
  const explainBlocks = (lesson.explanations || []).map((block) => `<div class="muted-panel"><strong>${esc(block.title)}</strong><p class="muted-text">${esc(block.text)}</p></div>`).join('');
  const checklist = (lesson.practiceChecklist || []).map((item) => `<li>${esc(item)}</li>`).join('');

  return {
    meta: `${pathTitle} · ${formatStage(selectedPathway?.stage || lesson.currentStage || 'decouverte')}`,
    title: lesson.title,
    html: `
      <div class="workshop-main">
        <section>
          <p class="eyebrow">Intention</p>
          <h3 class="workshop-title">${esc(lesson.sessionIntent || lesson.objective || lesson.description || '')}</h3>
          <p class="muted-text">${esc(lesson.description || '')}</p>
        </section>

        <section>
          <div class="section-head"><h3>À jouer</h3><span class="pill">${esc(lesson.practice?.duration || '6 à 10 min')}</span></div>
          <div class="muted-panel">
            <p><strong>Mise en place.</strong> ${esc(lesson.practice?.setup || '')}</p>
            <ul class="bullets">${practiceSteps}</ul>
          </div>
          <div class="muted-panel">
            <strong>Variation</strong>
            <p class="muted-text">${esc(lesson.variationPrompt || lesson.coachTip || '')}</p>
          </div>
        </section>

        <section>
          <div class="section-head"><h3>Exemples et supports</h3><span class="pill">Écouter puis jouer</span></div>
          <div class="lesson-list">${examples}${supports}</div>
        </section>

        <section>
          <div class="section-head"><h3>Suite d’accords modulable</h3><span class="pill">Playback</span></div>
          <article class="builder-card audio-card" data-builder-card>
            <p class="muted-text">Choisissez un preset ou composez votre progression par degrés. La signature rythmique s’applique à la suite d’accords et le click reste présent pendant la lecture.</p>
            <div class="builder-grid">
              <label>Preset
                <select data-builder-preset>
                  <option value="I V vi IV">I–V–vi–IV</option>
                  <option value="ii V I">ii–V–I</option>
                  <option value="I IV V">I–IV–V</option>
                  <option value="i VI III VII">i–VI–III–VII</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </label>
              <label>Progression
                <input data-builder-progression type="text" value="I V vi IV" placeholder="Ex. ii V I ou i bVII bVI V" />
              </label>
              <label>Tonalité
                <select data-builder-key>
                  <option>C</option><option>Db</option><option>D</option><option>Eb</option><option>E</option><option>F</option><option>Gb</option><option>G</option><option>Ab</option><option>A</option><option>Bb</option><option>B</option>
                </select>
              </label>
              <label>Mode
                <select data-builder-mode>
                  <option value="major">Majeur</option>
                  <option value="minor">Mineur</option>
                </select>
              </label>
              <label>Signature
                <select data-builder-signature>
                  <option value="4/4">4/4</option>
                  <option value="3/4">3/4</option>
                  <option value="5/4">5/4</option>
                  <option value="6/8">6/8</option>
                </select>
              </label>
              <label>Tempo
                <input data-player-tempo type="range" min="40" max="180" value="88" />
              </label>
            </div>
            <div class="tempo-row">
              <span class="tempo-readout">88 BPM</span>
              <label><input type="checkbox" data-player-loop checked /> Boucle</label>
              <label><input type="checkbox" data-player-click checked /> Click</label>
            </div>
            <div class="support-toolbar">
              <button class="primary-btn player-button" type="button" data-player-kind="builder">Lecture</button>
              <button class="secondary-btn" type="button" data-stop-player>Arrêter</button>
            </div>
            <div class="player-progress"><div class="player-progress-fill"></div></div>
          </article>
        </section>
      </div>

      <aside class="workshop-side">
        <section>
          <div class="section-head"><h3>Repères utiles</h3><span class="pill">À retenir</span></div>
          <ul class="bullets">${keyPoints}</ul>
        </section>

        <section>
          <details>
            <summary>Comprendre</summary>
            <div class="lesson-list" style="margin-top:1rem;">${explainBlocks}</div>
          </details>
        </section>

        <section>
          <div class="section-head"><h3>Auto-contrôle</h3><span class="pill">Avant le test</span></div>
          <ul class="bullets">${checklist}</ul>
        </section>

        <section>
          <div class="section-head"><h3>Test rapide</h3><span class="pill">Correction auto</span></div>
          <div id="lessonExerciseMount" class="exercise-box"></div>
        </section>

        <section>
          <div class="section-head"><h3>Valider</h3><span class="pill">Fin de séance</span></div>
          <p class="muted-text">Terminez la séance après avoir réellement joué la consigne. La validation met à jour la progression et génère les cartes de révision.</p>
          <button class="primary-btn" type="button" data-complete-workshop>Terminer la séance</button>
        </section>
      </aside>
    `,
  };
}

export function renderPathwayProgress(pathways, lessons, state, mountNode) {
  mountNode.innerHTML = pathways.map((pathway) => {
    const total = lessons.filter((lesson) => lesson.pathways?.some((p) => p.id === pathway.id)).length;
    const done = state.pathwayProgress[pathway.id]?.completedLessonIds?.length || 0;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return `
      <article class="pathway-progress-row">
        <strong>${esc(pathway.title)}</strong>
        <span class="muted-text">${esc(pathway.description)}</span>
        <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
        <span class="muted-text">${done} / ${total} ateliers validés</span>
      </article>
    `;
  }).join('');
}
