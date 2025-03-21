# Trainer-Client Relationship Feature

## Context
Implementing a system to manage trainer-client relationships, enabling trainers to oversee and guide their clients' workout progress.

## Objectives
1. Create a secure trainer-client relationship management system
2. Enable trainers to view and manage client workouts
3. Implement client progress tracking for trainers
4. Maintain data privacy and access control

## Technical Design

### 1. Database Schema Updates
```prisma
// Add to schema.prisma

model TrainerProfile {
  id          String    @id @default(uuid())
  userId      String    @unique
  user        User      @relation(fields: [userId], references: [id])
  bio         String?
  specialties String[]
  experience  Int?      // Years of experience
  clients     ClientTrainerRelationship[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model ClientTrainerRelationship {
  id          String    @id @default(uuid())
  trainerId   String
  clientId    String
  trainer     TrainerProfile @relation(fields: [trainerId], references: [id])
  client      User      @relation(fields: [clientId], references: [id])
  status      String    // pending, active, terminated
  startDate   DateTime  @default(now())
  endDate     DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([trainerId, clientId])
}

// Add to existing User model
model User {
  // ... existing fields
  trainerProfile    TrainerProfile?
  trainerRelations  ClientTrainerRelationship[] @relation("clientRelations")
}
```

### 2. API Endpoints

```typescript
// routes/api/trainer/+server.ts
interface TrainerEndpoints {
  // Trainer Profile Management
  'POST /api/trainer/profile': CreateTrainerProfile;
  'PUT /api/trainer/profile': UpdateTrainerProfile;
  'GET /api/trainer/profile/:id': GetTrainerProfile;

  // Client Management
  'POST /api/trainer/clients': SendClientInvite;
  'GET /api/trainer/clients': ListClients;
  'DELETE /api/trainer/clients/:id': RemoveClient;

  // Client Data Access
  'GET /api/trainer/clients/:id/workouts': GetClientWorkouts;
  'GET /api/trainer/clients/:id/progress': GetClientProgress;
}

// routes/api/client/+server.ts
interface ClientEndpoints {
  'GET /api/client/trainers': ListTrainers;
  'POST /api/client/trainers/:id/accept': AcceptTrainerInvite;
  'POST /api/client/trainers/:id/reject': RejectTrainerInvite;
  'DELETE /api/client/trainers/:id': RemoveTrainer;
}
```

### 3. Access Control Implementation
```typescript
// lib/server/auth.ts
export async function validateTrainerAccess(
  userId: string,
  clientId: string
): Promise<boolean> {
  const relationship = await prisma.clientTrainerRelationship.findFirst({
    where: {
      trainerId: userId,
      clientId: clientId,
      status: 'active'
    }
  });
  return !!relationship;
}

// Example usage in route
export async function load({ params, locals }) {
  const { clientId } = params;
  const { user } = await locals.supabase.auth.getUser();
  
  if (!user) throw redirect(303, '/');
  
  const hasAccess = await validateTrainerAccess(user.id, clientId);
  if (!hasAccess) throw error(403, 'Unauthorized');
  
  // Proceed with data access
}
```

### 4. UI Components

```typescript
// routes/trainer/dashboard/+page.svelte
interface TrainerDashboard {
  clientList: ClientSummary[];
  clientMetrics: Map<string, ClientMetrics>;
  pendingInvites: ClientInvite[];
}

// routes/trainer/client/[id]/+page.svelte
interface ClientView {
  clientProfile: ClientProfile;
  workoutHistory: WorkoutSummary[];
  progressMetrics: ProgressMetrics;
  programTemplates: ProgramTemplate[];
}

// routes/client/trainer/+page.svelte
interface TrainerView {
  trainerProfile: TrainerProfile;
  activePrograms: ProgramSummary[];
  communications: Communication[];
}
```

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Database schema updates
- [ ] Basic CRUD operations for trainer profiles
- [ ] Client-trainer relationship management
- [ ] Access control implementation

### Phase 2: Trainer Features
- [ ] Trainer dashboard
- [ ] Client management interface
- [ ] Client progress tracking
- [ ] Workout oversight tools

### Phase 3: Client Features
- [ ] Trainer selection interface
- [ ] Trainer communication tools
- [ ] Progress sharing controls
- [ ] Notification system

### Phase 4: Advanced Features
- [ ] Real-time updates for workout tracking
- [ ] Automated progress reports
- [ ] Communication history
- [ ] Program template sharing

## Security Considerations
1. Strict access control for client data
2. Audit logging for data access
3. Data encryption for sensitive information
4. Rate limiting for API endpoints
5. Input validation and sanitization

## Success Metrics
1. Trainer adoption rate
2. Client satisfaction metrics
3. System performance under load
4. Data access response times
5. Security audit compliance

## Testing Strategy
1. Unit tests for all core functionality
2. Integration tests for trainer-client workflows
3. Security testing for access control
4. Performance testing for data access
5. UI/UX testing with real users

## Dependencies
- Prisma schema updates
- Supabase authentication integration
- SvelteKit route handlers
- UI component library updates

## Notes
- Consider implementing a trial period for trainer-client relationships
- Plan for future scaling of trainer-client ratios
- Consider adding support for group training scenarios
- Document privacy policy updates
