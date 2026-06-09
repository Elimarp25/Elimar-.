document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select so repeated fetches don't duplicate options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

            const participantsHTML = (details.participants && details.participants.length)
              ? `<div class="participants"><h5 class="participants-title">Participants</h5><ul class="participants-list">${details.participants.map(p => `<li class="participant-item"><span class="participant-email">${p}</span><button class="participant-remove" data-activity="${encodeURIComponent(name)}" data-email="${encodeURIComponent(p)}" aria-label="Remove participant">&times;</button></li>`).join('')}</ul></div>`
              : `<div class="participants"><p class="no-participants">No participants yet</p></div>`;

            activityCard.innerHTML = `
              <h4>${name}</h4>
              <p>${details.description}</p>
              <p><strong>Schedule:</strong> ${details.schedule}</p>
              <p class="availability"><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
              ${participantsHTML}
            `;
            // Store max participants for DOM updates
            activityCard.dataset.maxParticipants = details.max_participants;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);

        // Attach delete handlers for participant remove buttons (remove from DOM and update counter)
        const removeButtons = activityCard.querySelectorAll('.participant-remove');
        removeButtons.forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const activity = decodeURIComponent(btn.getAttribute('data-activity'));
            const email = decodeURIComponent(btn.getAttribute('data-email'));
            try {
              const res = await fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              const result = await res.json();
              if (res.ok) {
                messageDiv.textContent = result.message;
                messageDiv.className = 'success';

                // Animate removal: add .removing, then remove after transition
                const li = btn.closest('li');
                const participantsList = activityCard.querySelector('.participants-list');
                const max = parseInt(activityCard.dataset.maxParticipants, 10) || 0;
                if (li) {
                  li.classList.add('removing');
                  const onTransitionEnd = () => {
                    li.removeEventListener('transitionend', onTransitionEnd);
                    li.remove();

                    // Update spots left after removal
                    if (participantsList && participantsList.children.length > 0) {
                      const spotsLeftEl = activityCard.querySelector('.spots-left');
                      const spotsLeftNow = max - participantsList.children.length;
                      if (spotsLeftEl) spotsLeftEl.textContent = spotsLeftNow;
                    } else {
                      const participantsDiv = activityCard.querySelector('.participants');
                      if (participantsDiv) participantsDiv.innerHTML = `<p class="no-participants">No participants yet</p>`;
                      const spotsLeftEl = activityCard.querySelector('.spots-left');
                      if (spotsLeftEl) spotsLeftEl.textContent = max;
                    }
                  };
                  li.addEventListener('transitionend', onTransitionEnd, { once: true });
                  // Fallback: ensure removal after 300ms if transitionend doesn't fire
                  setTimeout(() => {
                    if (document.body.contains(li)) {
                      li.remove();
                      if (participantsList && participantsList.children.length >= 0) {
                        const spotsLeftEl = activityCard.querySelector('.spots-left');
                        const spotsLeftNow = max - (participantsList.children.length);
                        if (spotsLeftEl) spotsLeftEl.textContent = spotsLeftNow;
                      }
                    }
                  }, 350);
                }

              } else {
                messageDiv.textContent = result.detail || 'An error occurred';
                messageDiv.className = 'error';
              }
              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            } catch (err) {
              messageDiv.textContent = 'Failed to unregister. Please try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              console.error('Error unregistering:', err);
            }
          });
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Optimistically insert the new participant into the DOM with an animation
        const activityCards = document.querySelectorAll('.activity-card');
        let targetCard = null;
        activityCards.forEach(card => {
          const title = card.querySelector('h4');
          if (title && title.textContent === activity) targetCard = card;
        });

        if (targetCard) {
          const participantsDiv = targetCard.querySelector('.participants');
          let participantsList = participantsDiv ? participantsDiv.querySelector('.participants-list') : null;

          // If there was no participants section, recreate it
          if (!participantsList) {
            if (participantsDiv) {
              participantsDiv.innerHTML = `<h5 class="participants-title">Participants</h5><ul class="participants-list"></ul>`;
            } else {
              // create the participants container
              const newDiv = document.createElement('div');
              newDiv.className = 'participants';
              newDiv.innerHTML = `<h5 class="participants-title">Participants</h5><ul class="participants-list"></ul>`;
              targetCard.appendChild(newDiv);
            }
            participantsList = targetCard.querySelector('.participants-list');
          }

          // Create the new participant list item
          const li = document.createElement('li');
          li.className = 'participant-item adding';
          li.innerHTML = `<span class="participant-email">${email}</span><button class="participant-remove" data-activity="${encodeURIComponent(activity)}" data-email="${encodeURIComponent(email)}" aria-label="Remove participant">&times;</button>`;
          participantsList.appendChild(li);

          // Trigger the entrance animation by removing the 'adding' class on next frame
          requestAnimationFrame(() => requestAnimationFrame(() => li.classList.remove('adding')));

          // Attach remove handler to the new button
          const btn = li.querySelector('.participant-remove');
          if (btn) {
            btn.addEventListener('click', async () => {
              try {
                const res = await fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
                const result = await res.json();
                if (res.ok) {
                  // reuse existing removal animation logic
                  li.classList.add('removing');
                  li.addEventListener('transitionend', () => li.remove(), { once: true });
                } else {
                  messageDiv.textContent = result.detail || 'An error occurred';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                }
              } catch (err) {
                messageDiv.textContent = 'Failed to unregister. Please try again.';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                console.error('Error unregistering:', err);
              }
            });
          }

          // Update spots-left counter
          const spotsLeftEl = targetCard.querySelector('.spots-left');
          const max = parseInt(targetCard.dataset.maxParticipants, 10) || 0;
          if (spotsLeftEl) {
            const currentCount = participantsList.children.length;
            const spotsLeftNow = max - currentCount;
            spotsLeftEl.textContent = spotsLeftNow;
          }
        } else {
          // If target card not found, refresh full list as fallback
          fetchActivities();
        }

      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
