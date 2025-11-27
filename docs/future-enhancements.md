# Future Enhancements

This document tracks planned enhancements that are not required for MVP but should be considered for future releases.

---

## Per-Partner Data Isolation Within Projects

**Priority:** Post-MVP  
**Status:** Documented  
**Estimated Effort:** Medium

### Current Behavior

Currently, all partners invited to the same project can see the same data:
- All specs shared with the project
- All mock servers for the project
- All test suites and runs
- All traces
- All plan items and milestones

This is **collaborative by design** — partners work together on a shared integration workspace.

### Future Enhancement

Some use cases may require **per-partner data isolation**, where:
- Partner A sees only specs/mocks/tests relevant to their integration
- Partner B has a separate view with their own subset of data
- Evidence uploads are already scoped per-partner (this works today)

### Implementation Steps

#### 1. Schema Changes

Add a `partnerProjectId` foreign key to entities that should be partner-scoped:

```prisma
model Spec {
  // ... existing fields ...
  visibleToPartnerProjects PartnerProject[] @relation("PartnerVisibleSpecs")
}

model MockInstance {
  // ... existing fields ...
  visibleToPartnerProjects PartnerProject[] @relation("PartnerVisibleMocks")
}

model TestSuite {
  // ... existing fields ...
  visibleToPartnerProjects PartnerProject[] @relation("PartnerVisibleSuites")
}
```

#### 2. Router Changes

Update `partnerProjectRouter.current` to filter by visibility:

```typescript
// Instead of returning all project specs:
specs: data.project.specs

// Filter to only partner-visible specs:
specs: data.project.specs.filter(spec => 
  spec.visibleToPartnerProjects.some(pp => pp.id === ctx.session.partnerProjectId)
)
```

#### 3. Admin UI for Visibility Management

Add a client portal interface to:
- Assign specs/mocks/tests to specific partner projects
- Toggle "visible to all partners" vs "visible to specific partners"
- Bulk assign visibility when sharing new resources

#### 4. Migration Strategy

For existing data:
- Default all existing specs/mocks/tests to "visible to all partners" 
- This maintains backward compatibility
- New resources can be selectively assigned

### Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add visibility relations |
| `lib/trpc/partner/routers/project.ts` | Filter queries by visibility |
| `components/specs-page.tsx` (client) | Add partner visibility UI |
| `lib/trpc/routers/spec.ts` | Add visibility management mutations |

### Considerations

- **Performance**: Many-to-many visibility relations add query complexity
- **UX**: Need clear UI for managing visibility without overwhelming users
- **Default behavior**: New resources should default to "visible to all" for simplicity

---

## Additional Future Enhancements

### Role-Based Access Control (RBAC) Expansion

Extend the current `OWNER | ADMIN | VENDOR | PARTNER | VIEWER` roles with:
- Custom permission sets
- Resource-level permissions
- Audit logging for permission changes

### Partner Self-Registration

Allow partners to request access without requiring manual invite token generation:
- Partner submits registration request
- Admin approves/denies in client portal
- Automatic invite token generation on approval

### Multi-Organization User Membership

Currently users belong to one organization. Future enhancement:
- Users can be members of multiple organizations
- Organization switcher in the UI
- Scoped sessions per active organization

---

*Last updated: November 2025*

