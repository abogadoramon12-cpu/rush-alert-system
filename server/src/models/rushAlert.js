class RushAlert {
  constructor({
    id,
    date,
    coordinator,
    reminder,
    detectedAt = new Date(),
    deadline,
    status = "ACTIVE",
    acknowledgedAt = null,
    completedAt = null,
  }) {
    this.id = id;
    this.date = date;
    this.coordinator = coordinator;
    this.reminder = reminder;

    this.detectedAt = detectedAt;
    this.deadline = deadline;

    this.status = status;

    this.acknowledgedAt = acknowledgedAt;
    this.completedAt = completedAt;
  }
}

module.exports = RushAlert;