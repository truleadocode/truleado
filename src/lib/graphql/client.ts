/**
 * GraphQL Client for Frontend
 * 
 * Provides a simple way to make GraphQL requests with authentication.
 */

import { getIdToken } from '@/lib/firebase/client';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code?: string;
      field?: string;
    };
  }>;
}

interface GraphQLError extends Error {
  code?: string;
  field?: string;
}

/**
 * Execute a GraphQL query or mutation
 */
export async function graphqlRequest<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = await getIdToken();
  
  if (!token) {
    const error = new Error('Not authenticated') as GraphQLError;
    error.code = 'UNAUTHENTICATED';
    throw error;
  }

  // Apollo Server requires a non-empty `query`; ensure we never send empty/undefined
  const queryStr = typeof query === 'string' ? query.trim() : '';
  if (!queryStr) {
    const error = new Error('GraphQL request requires a non-empty query or mutation string') as GraphQLError;
    error.code = 'BAD_REQUEST';
    throw error;
  }

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: queryStr,
      variables: variables ?? undefined,
    }),
  });

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    const firstError = result.errors[0];
    const error = new Error(firstError.message) as GraphQLError;
    error.code = firstError.extensions?.code;
    error.field = firstError.extensions?.field;
    throw error;
  }

  if (!result.data) {
    throw new Error('No data returned from GraphQL');
  }

  return result.data;
}

/**
 * GraphQL query fragments for reuse
 */
export const fragments = {
  client: `
    fragment ClientFields on Client {
      id
      name
      isActive
      createdAt
      accountManager {
        id
        name
        email
      }
    }
  `,
  
  project: `
    fragment ProjectFields on Project {
      id
      name
      startDate
      endDate
      isArchived
      createdAt
    }
  `,
  
  campaign: `
    fragment CampaignFields on Campaign {
      id
      name
      status
      startDate
      endDate
      createdAt
    }
  `,
  
  user: `
    fragment UserFields on User {
      id
      name
      email
      avatarUrl
    }
  `,
};

/**
 * Pre-built queries
 */
export const queries = {
  clients: `
    query GetClients($agencyId: ID!) {
      clients(agencyId: $agencyId) {
        id
        name
        isActive
        industry
        clientStatus
        country
        logoUrl
        clientSince
        currency
        createdAt
        accountManager {
          id
          name
          email
        }
        projects {
          id
          isArchived
          campaigns {
            id
            totalBudget
          }
        }
      }
    }
  `,
  
  client: `
    query GetClient($id: ID!) {
      client(id: $id) {
        id
        name
        isActive
        industry
        websiteUrl
        country
        logoUrl
        description
        clientStatus
        clientSince
        currency
        paymentTerms
        billingEmail
        taxNumber
        instagramHandle
        youtubeUrl
        tiktokHandle
        linkedinUrl
        source
        internalNotes
        createdAt
        accountManager {
          id
          name
          email
        }
        projects {
          id
          name
          isArchived
          startDate
          endDate
          projectUsers {
            id
            user { id name email }
          }
          campaigns {
            id
            name
            status
            campaignType
            totalBudget
            currency
            startDate
            endDate
            creators {
              id
            }
          }
        }
        contacts {
          id
          firstName
          lastName
          email
          phone
          mobile
          officePhone
          homePhone
          address
          department
          notes
          isClientApprover
          profilePhotoUrl
          jobTitle
          isPrimaryContact
          linkedinUrl
          preferredChannel
          contactType
          contactStatus
          notificationPreference
          birthday
          createdAt
        }
      }
    }
  `,
  
  contactDetail: `
    query GetContactDetail($id: ID!) {
      contact(id: $id) {
        id
        firstName
        lastName
        email
        phone
        mobile
        officePhone
        homePhone
        address
        department
        notes
        isClientApprover
        profilePhotoUrl
        jobTitle
        isPrimaryContact
        linkedinUrl
        preferredChannel
        contactType
        contactStatus
        notificationPreference
        birthday
        createdAt
        updatedAt
        client {
          id
          name
          logoUrl
          industry
          clientStatus
          country
          projects {
            id
            name
            campaigns {
              id
              name
              status
              campaignType
              startDate
              totalBudget
            }
          }
          contacts {
            id
            firstName
            lastName
            profilePhotoUrl
            jobTitle
            contactType
            isPrimaryContact
          }
        }
      }
    }
  `,

  contactNotes: `
    query GetContactNotes($contactId: ID!) {
      contactNotes(contactId: $contactId) {
        id
        message
        isPinned
        createdBy { id name email }
        updatedAt
        createdAt
      }
    }
  `,

  contactInteractions: `
    query GetContactInteractions($contactId: ID!, $limit: Int) {
      contactInteractions(contactId: $contactId, limit: $limit) {
        id
        interactionType
        interactionDate
        note
        createdBy { id name email }
        createdAt
      }
    }
  `,

  contactReminders: `
    query GetContactReminders($contactId: ID!) {
      contactReminders(contactId: $contactId) {
        id
        reminderType
        reminderDate
        note
        isDismissed
        createdBy { id name email }
        createdAt
      }
    }
  `,

  contactsList: `
    query GetContactsList($agencyId: ID!, $clientId: ID, $department: String, $isClientApprover: Boolean) {
      contactsList(agencyId: $agencyId, clientId: $clientId, department: $department, isClientApprover: $isClientApprover) {
        id
        firstName
        lastName
        email
        phone
        mobile
        officePhone
        homePhone
        address
        department
        notes
        isClientApprover
        profilePhotoUrl
        jobTitle
        isPrimaryContact
        linkedinUrl
        preferredChannel
        contactType
        contactStatus
        notificationPreference
        birthday
        client { id name logoUrl industry clientStatus }
        createdAt
        updatedAt
      }
    }
  `,

  projects: `
    query GetProjects($clientId: ID!) {
      projects(clientId: $clientId) {
        id
        name
        description
        startDate
        endDate
        isArchived
        createdAt
        client {
          id
          name
        }
        campaigns {
          id
          name
          status
          deliverables {
            id
            title
            description
            deliverableType
            status
            dueDate
            createdAt
            versions {
              id
            }
          }
        }
      }
    }
  `,
  
  project: `
    query GetProject($id: ID!) {
      project(id: $id) {
        id
        name
        description
        startDate
        endDate
        isArchived
        createdAt
        projectType
        status
        priority
        source
        currency
        influencerBudget
        agencyFee
        agencyFeeType
        productionBudget
        boostingBudget
        contingency
        platforms
        campaignObjectives
        influencerTiers
        plannedCampaigns
        targetReach
        targetImpressions
        targetEngagementRate
        targetConversions
        approvalTurnaround
        reportingCadence
        briefFileUrl
        contractFileUrl
        exclusivityClause
        exclusivityTerms
        contentUsageRights
        renewalDate
        externalFolderLink
        tags
        internalNotes
        projectManager { id name email }
        clientPoc { id firstName lastName email jobTitle }
        influencerApprovalContact { id firstName lastName }
        contentApprovalContact { id firstName lastName }
        client {
          id
          name
          logoUrl
          industry
          currency
          accountManager {
            id
            name
            email
          }
        }
        campaigns {
          id
          name
          status
          startDate
          endDate
          totalBudget
          creators {
            id
            rateAmount
            creator {
              id
              displayName
              profilePictureUrl
            }
          }
          deliverables {
            id
            title
            status
            dueDate
          }
        }
        projectApprovers {
          id
          createdAt
          user { id name email }
        }
        projectUsers {
          id
          createdAt
          user { id name email }
        }
      }
    }
  `,
  
  agencyUsers: `
    query GetAgencyUsers($agencyId: ID!) {
      agency(id: $agencyId) {
        id
        currencyCode
        timezone
        languageCode
        users {
          id
          role
          isActive
          user {
            id
            name
            email
          }
        }
      }
    }
  `,

  agencyLocale: `
    query GetAgencyLocale($agencyId: ID!) {
      agency(id: $agencyId) {
        id
        name
        currencyCode
        timezone
        languageCode
      }
    }
  `,

  agencyProfile: `
    query GetAgencyProfile($agencyId: ID!) {
      agency(id: $agencyId) {
        id
        name
        logoUrl
        description
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
        primaryEmail
        phone
        website
      }
    }
  `,

  pendingInvitations: `
    query GetPendingInvitations($agencyId: ID!) {
      pendingInvitations(agencyId: $agencyId) {
        id
        email
        role
        status
        expiresAt
        createdAt
        invitedBy { name email }
      }
    }
  `,

  invitationByToken: `
    query GetInvitationByToken($token: String!) {
      invitationByToken(token: $token) {
        id
        email
        role
        agencyName
        status
        expiresAt
      }
    }
  `,

  campaigns: `
    query GetCampaigns($projectId: ID!) {
      campaigns(projectId: $projectId) {
        id
        name
        description
        status
        campaignType
        startDate
        endDate
        createdAt
        project {
          id
          name
          client {
            id
            name
          }
        }
        deliverables {
          id
          title
          status
        }
        creators {
          id
          creator {
            id
            displayName
          }
        }
      }
    }
  `,

  allCampaigns: `
    query GetAllCampaigns($agencyId: ID!) {
      allCampaigns(agencyId: $agencyId) {
        id
        name
        description
        status
        objective
        campaignType
        startDate
        endDate
        totalBudget
        currency
        budgetControlType
        clientContractValue
        createdAt
        project {
          id
          name
          client {
            id
            name
            logoUrl
            industry
          }
        }
        deliverables {
          id
          deliverableType
          status
          dueDate
          creator {
            id
            displayName
          }
          trackingRecord {
            id
            urls { url }
          }
          approvals {
            id
            decision
          }
        }
        creators {
          id
          status
          rateAmount
          rateCurrency
          creator {
            id
            displayName
            profilePictureUrl
            followers
            engagementRate
            instagramHandle
            youtubeHandle
            tiktokHandle
          }
        }
        users {
          id
          role
          user {
            id
            name
            email
          }
        }
      }
    }
  `,
  
  campaignNotes: `
    query GetCampaignNotes($campaignId: ID!) {
      campaignNotes(campaignId: $campaignId) {
        id
        message
        noteType
        isPinned
        createdBy {
          id
          name
          email
        }
        updatedAt
        createdAt
      }
    }
  `,

  agencyProjects: `
    query GetAgencyProjects($agencyId: ID!) {
      agencyProjects(agencyId: $agencyId) {
        id
        name
        description
        startDate
        endDate
        isArchived
        createdAt
        projectType
        status
        priority
        currency
        influencerBudget
        agencyFee
        agencyFeeType
        productionBudget
        boostingBudget
        contingency
        platforms
        renewalDate
        tags
        client {
          id
          name
          logoUrl
          industry
        }
        campaigns {
          id
          name
          status
          totalBudget
          startDate
          endDate
        }
        projectManager {
          id
          name
          email
        }
      }
    }
  `,

  deliverable: `
    query GetDeliverable($id: ID!) {
      deliverable(id: $id) {
        id
        title
        description
        deliverableType
        status
        dueDate
        createdAt
        creator {
          id
          displayName
          email
          instagramHandle
          youtubeHandle
        }
        campaign {
          id
          name
          status
          campaignType
          users {
            role
            user { id name email }
          }
          creators {
            id
            status
            proposalState
            creator {
              id
              displayName
              email
              instagramHandle
              youtubeHandle
            }
          }
          project {
            id
            name
            approverUsers { id name email }
            client {
              id
              name
              approverUsers { id name email }
            }
          }
        }
        versions {
          id
          versionNumber
          fileUrl
          fileName
          caption
          fileSize
          mimeType
          createdAt
          uploadedBy {
            id
            name
            email
          }
          captionAudits {
            id
            oldCaption
            newCaption
            changedAt
            changedBy {
              id
              name
              email
            }
          }
        }
        comments {
          id
          message
          createdByType
          createdAt
          createdBy {
            id
            name
            email
          }
        }
        submissionEvents {
          id
          createdAt
          submittedBy {
            id
            name
            email
          }
        }
        approvals {
          id
          decision
          approvalLevel
          comment
          decidedAt
          deliverableVersion { id }
          decidedBy {
            id
            name
            email
          }
        }
        trackingRecord {
          id
          deliverableName
          createdAt
          startedBy {
            id
            name
          }
          urls {
            id
            url
            displayOrder
            createdAt
          }
        }
      }
    }
  `,

  deliverables: `
    query GetDeliverables($campaignId: ID!) {
      deliverables(campaignId: $campaignId) {
        id
        title
        description
        deliverableType
        status
        dueDate
        createdAt
        versions {
          id
          versionNumber
        }
      }
    }
  `,

  deliverablesPendingClientApproval: `
    query GetDeliverablesPendingClientApproval {
      deliverablesPendingClientApproval {
        id
        title
        description
        deliverableType
        status
        dueDate
        createdAt
        campaign {
          id
          name
          project {
            id
            name
            client {
              id
              name
            }
          }
        }
      }
    }
  `,

  agencyEmailConfig: `
    query GetAgencyEmailConfig($agencyId: ID!) {
      agencyEmailConfig(agencyId: $agencyId) {
        id
        agencyId
        smtpHost
        smtpPort
        smtpSecure
        smtpUsername
        fromEmail
        fromName
        novuIntegrationIdentifier
        useCustomSmtp
        createdAt
        updatedAt
      }
    }
  `,

  creators: `
    query GetCreators($agencyId: ID!, $includeInactive: Boolean) {
      creators(agencyId: $agencyId, includeInactive: $includeInactive) {
        id
        displayName
        email
        phone
        instagramHandle
        youtubeHandle
        tiktokHandle
        facebookHandle
        linkedinHandle
        notes
        isActive
        createdAt
      }
    }
  `,

  creator: `
    query GetCreator($id: ID!) {
      creator(id: $id) {
        id
        displayName
        email
        phone
        instagramHandle
        youtubeHandle
        tiktokHandle
        facebookHandle
        linkedinHandle
        notes
        isActive
        createdAt
        updatedAt
        rates {
          id
          platform
          deliverableType
          rateAmount
          rateCurrency
          createdAt
          updatedAt
        }
        campaignAssignments {
          id
          status
          rateAmount
          rateCurrency
          notes
          campaign {
            id
            name
            status
          }
          createdAt
        }
      }
    }
  `,

  campaign: `
    query GetCampaign($id: ID!) {
      campaign(id: $id) {
        id
        name
        description
        brief
        status
        campaignType
        startDate
        endDate
        totalBudget
        currency
        budgetControlType
        clientContractValue
        objective
        platforms
        hashtags
        mentions
        postingInstructions
        exclusivityClause
        exclusivityTerms
        contentUsageRights
        giftingEnabled
        giftingDetails
        targetReach
        targetImpressions
        targetEngagementRate
        targetViews
        targetConversions
        targetSales
        utmSource
        utmMedium
        utmCampaign
        utmContent
        createdAt
        project {
          id
          name
          client {
            id
            name
            logoUrl
            industry
            accountManager {
              id
              name
              email
            }
          }
        }
        deliverables {
          id
          title
          description
          status
          trackingRecord {
            id
            urls { id url displayOrder }
            createdAt
          }
          deliverableType
          dueDate
          creator { id displayName }
          versions {
            id
            versionNumber
            fileUrl
            fileName
            caption
            createdAt
          }
          approvals {
            id
            decision
            decidedBy { id name }
            decidedAt
          }
          submissionEvents {
            id
            createdAt
          }
          createdAt
        }
        creators {
          id
          status
          rateAmount
          rateCurrency
          notes
          proposalState
          currentProposal {
            id
            versionNumber
            state
            rateAmount
            rateCurrency
            notes
            createdByType
            createdAt
          }
          proposalVersions {
            id
            versionNumber
            state
            rateAmount
            rateCurrency
            notes
            createdByType
            createdAt
          }
          proposalNotes {
            id
            message
            createdByType
            createdAt
          }
          creator {
            id
            displayName
            email
            instagramHandle
            youtubeHandle
            tiktokHandle
            profilePictureUrl
            followers
            engagementRate
          }
        }
        attachments {
          id
          fileName
          fileUrl
          fileSize
          mimeType
          uploadedBy { id name }
          createdAt
        }
        users {
          id
          role
          user { id name email }
          createdAt
        }
        activityLogs {
          id
          action
          entityType
          entityId
          metadata
          actor { id name email }
          createdAt
        }
      }
    }
  `,

  // Social Media Analytics
  creatorSocialProfiles: `
    query GetCreatorSocialProfiles($creatorId: ID!) {
      creatorSocialProfiles(creatorId: $creatorId) {
        id
        platform
        platformUsername
        platformDisplayName
        profilePicUrl
        bio
        followersCount
        followingCount
        postsCount
        isVerified
        isBusinessAccount
        externalUrl
        subscribersCount
        totalViews
        channelId
        avgLikes
        avgComments
        avgViews
        engagementRate
        lastFetchedAt
      }
    }
  `,

  creatorSocialPosts: `
    query GetCreatorSocialPosts($creatorId: ID!, $platform: String!, $limit: Int) {
      creatorSocialPosts(creatorId: $creatorId, platform: $platform, limit: $limit) {
        id
        platform
        platformPostId
        postType
        caption
        url
        thumbnailUrl
        likesCount
        commentsCount
        viewsCount
        publishedAt
      }
    }
  `,

  socialDataJobs: `
    query GetSocialDataJobs($creatorId: ID!) {
      socialDataJobs(creatorId: $creatorId) {
        id
        platform
        jobType
        status
        errorMessage
        tokensConsumed
        startedAt
        completedAt
        createdAt
      }
    }
  `,

  socialDataJob: `
    query GetSocialDataJob($jobId: ID!) {
      socialDataJob(jobId: $jobId) {
        id
        platform
        status
        errorMessage
        completedAt
      }
    }
  `,

  // Creator Portal Queries
  myCreatorProfile: `
    query MyCreatorProfile {
      myCreatorProfile {
        id
        displayName
        email
        phone
        instagramHandle
        youtubeHandle
        tiktokHandle
        facebookHandle
        linkedinHandle
        notes
        isActive
        createdAt
      }
    }
  `,

  myCreatorCampaigns: `
    query MyCreatorCampaigns {
      myCreatorCampaigns {
        id
        status
        rateAmount
        rateCurrency
        notes
        proposalState
        proposalAcceptedAt
        createdAt
        campaign {
          id
          name
          description
          status
          startDate
          endDate
          project {
            id
            name
            client {
              id
              name
            }
          }
        }
        currentProposal {
          id
          versionNumber
          state
          rateAmount
          rateCurrency
          notes
          createdByType
          createdAt
        }
        proposalVersions {
          id
          versionNumber
          state
          rateAmount
          rateCurrency
          notes
          createdByType
          createdAt
        }
        proposalNotes {
          id
          message
          createdByType
          createdAt
        }
      }
    }
  `,

  myCreatorDeliverables: `
    query MyCreatorDeliverables($campaignId: ID) {
      myCreatorDeliverables(campaignId: $campaignId) {
        id
        title
        description
        deliverableType
        status
        dueDate
        createdAt
        campaign {
          id
          name
          project {
            id
            name
            client {
              id
              name
            }
          }
        }
        versions {
          id
          versionNumber
          fileUrl
          fileName
          createdAt
        }
        trackingRecord {
          id
          urls {
            id
            url
          }
        }
      }
    }
  `,

  myCreatorProposal: `
    query MyCreatorProposal($campaignCreatorId: ID!) {
      myCreatorProposal(campaignCreatorId: $campaignCreatorId) {
        id
        versionNumber
        state
        rateAmount
        rateCurrency
        notes
        deliverableScopes {
          deliverableType
          quantity
          notes
        }
        createdByType
        createdAt
      }
    }
  `,

  // Billing / Token Purchases
  agencyTokenBalance: `
    query GetAgencyTokenBalance($id: ID!) {
      agency(id: $id) {
        id
        tokenBalance
        premiumTokenBalance
        subscriptionStatus
        subscriptionTier
        billingInterval
        trialEndDate
        subscriptionEndDate
      }
    }
  `,

  subscriptionPlans: `
    query GetSubscriptionPlans($currency: String!) {
      subscriptionPlans(currency: $currency) {
        id
        tier
        billingInterval
        currency
        priceAmount
        isActive
      }
    }
  `,

  subscriptionPayments: `
    query GetSubscriptionPayments($agencyId: ID!) {
      subscriptionPayments(agencyId: $agencyId) {
        id
        planTier
        billingInterval
        amount
        currency
        status
        periodStart
        periodEnd
        createdAt
        completedAt
      }
    }
  `,

  tokenPurchases: `
    query GetTokenPurchases($agencyId: ID!) {
      tokenPurchases(agencyId: $agencyId) {
        id
        purchaseType
        tokenQuantity
        amountPaise
        currency
        razorpayOrderId
        status
        createdAt
        completedAt
      }
    }
  `,

  // Deliverable Analytics
  campaignAnalyticsDashboard: `
    query CampaignAnalyticsDashboard($campaignId: ID!) {
      campaignAnalyticsDashboard(campaignId: $campaignId) {
        campaignId
        campaignName
        totalDeliverablesTracked
        totalUrlsTracked
        totalViews
        totalLikes
        totalComments
        totalShares
        totalSaves
        weightedEngagementRate
        avgEngagementRate
        avgSaveRate
        avgViralityIndex
        totalCreatorCost
        costCurrency
        cpv
        cpe
        viewsDelta
        likesDelta
        engagementRateDelta
        platformBreakdown
        creatorBreakdown
        lastRefreshedAt
        snapshotCount
        latestJob {
          id
          status
          totalUrls
          completedUrls
          failedUrls
          errorMessage
          createdAt
          completedAt
        }
        deliverables {
          deliverableId
          deliverableTitle
          creatorName
          urls {
            trackingUrlId
            url
            platform
            latestMetrics {
              views
              likes
              comments
              shares
              saves
              calculatedMetrics
              snapshotAt
            }
          }
          totalViews
          totalLikes
          totalComments
          totalShares
          totalSaves
          avgEngagementRate
          lastFetchedAt
        }
      }
    }
  `,

  analyticsFetchJob: `
    query AnalyticsFetchJob($jobId: ID!) {
      analyticsFetchJob(jobId: $jobId) {
        id
        campaignId
        status
        totalUrls
        completedUrls
        failedUrls
        errorMessage
        startedAt
        completedAt
        createdAt
      }
    }
  `,

  // Finance Module
  campaignFinanceSummary: `
    query CampaignFinanceSummary($campaignId: ID!) {
      campaignFinanceSummary(campaignId: $campaignId) {
        campaignId
        totalBudget
        currency
        budgetControlType
        clientContractValue
        committed
        paid
        otherExpenses
        totalSpend
        remainingBudget
        profit
        marginPercent
        budgetUtilization
        warningLevel
      }
    }
  `,

  creatorAgreements: `
    query CreatorAgreements($campaignId: ID!) {
      creatorAgreements(campaignId: $campaignId) {
        id
        campaignId
        campaignCreator {
          id
          creator {
            id
            displayName
            email
          }
        }
        originalAmount
        originalCurrency
        fxRate
        convertedAmount
        convertedCurrency
        status
        paidAt
        cancelledAt
        notes
        createdAt
      }
    }
  `,

  campaignExpenses: `
    query CampaignExpenses($campaignId: ID!, $category: ExpenseCategory, $status: ExpenseStatus) {
      campaignExpenses(campaignId: $campaignId, category: $category, status: $status) {
        id
        campaignId
        name
        category
        originalAmount
        originalCurrency
        fxRate
        convertedAmount
        convertedCurrency
        receiptUrl
        status
        paidAt
        notes
        createdBy {
          id
          name
        }
        createdAt
      }
    }
  `,

  campaignFinanceLogs: `
    query CampaignFinanceLogs($campaignId: ID!, $limit: Int, $offset: Int) {
      campaignFinanceLogs(campaignId: $campaignId, limit: $limit, offset: $offset) {
        id
        campaignId
        actionType
        metadataJson
        performedBy {
          id
          name
        }
        createdAt
      }
    }
  `,

  // Discovery Module
  discoverySearch: `
    query DiscoverySearch($agencyId: ID!, $platform: DiscoveryPlatform!, $filters: JSON!, $sort: JSON, $skip: Int, $limit: Int) {
      discoverySearch(agencyId: $agencyId, platform: $platform, filters: $filters, sort: $sort, skip: $skip, limit: $limit) {
        accounts {
          userId
          username
          fullname
          followers
          engagementRate
          engagements
          avgViews
          avgLikes
          isVerified
          picture
          url
          searchResultId
          isHidden
          platform
        }
        total
      }
    }
  `,

  discoveryUnlocks: `
    query DiscoveryUnlocks($agencyId: ID!, $platform: DiscoveryPlatform, $limit: Int, $offset: Int) {
      discoveryUnlocks(agencyId: $agencyId, platform: $platform, limit: $limit, offset: $offset) {
        id
        platform
        onsocialUserId
        searchResultId
        username
        fullname
        profileData
        tokensSpent
        unlockedBy
        unlockedAt
        expiresAt
      }
    }
  `,

  discoveryExports: `
    query DiscoveryExports($agencyId: ID!, $limit: Int, $offset: Int) {
      discoveryExports(agencyId: $agencyId, limit: $limit, offset: $offset) {
        id
        platform
        exportType
        filterSnapshot
        totalAccounts
        tokensSpent
        onsocialExportId
        status
        downloadUrl
        exportedBy
        createdAt
        completedAt
      }
    }
  `,

  savedSearches: `
    query SavedSearches($agencyId: ID!) {
      savedSearches(agencyId: $agencyId) {
        id
        name
        platform
        filters
        sortField
        sortOrder
        createdBy
        createdAt
        updatedAt
      }
    }
  `,

  discoveryPricing: `
    query DiscoveryPricing($agencyId: ID!, $provider: String) {
      discoveryPricing(agencyId: $agencyId, provider: $provider) {
        id
        provider
        action
        tokenType
        providerCost
        internalCost
        isActive
      }
    }
  `,

  discoveryEstimateCost: `
    query DiscoveryEstimateCost($agencyId: ID!, $action: String!, $count: Int!) {
      discoveryEstimateCost(agencyId: $agencyId, action: $action, count: $count) {
        unitCost
        totalCost
        currentBalance
        sufficientBalance
      }
    }
  `,

  discoveryDictionary: `
    query DiscoveryDictionary($type: String!, $query: String, $platform: DiscoveryPlatform) {
      discoveryDictionary(type: $type, query: $query, platform: $platform)
    }
  `,

  // Client Detail
  clientNotes: `
    query GetClientNotes($clientId: ID!) {
      clientNotes(clientId: $clientId) {
        id
        message
        isPinned
        createdBy { id name email }
        updatedAt
        createdAt
      }
    }
  `,

  clientActivityFeed: `
    query GetClientActivityFeed($clientId: ID!, $limit: Int) {
      clientActivityFeed(clientId: $clientId, limit: $limit) {
        id
        action
        entityType
        entityId
        metadata
        actor { id name email }
        createdAt
      }
    }
  `,

  clientFiles: `
    query GetClientFiles($clientId: ID!) {
      clientFiles(clientId: $clientId) {
        id
        fileName
        fileUrl
        fileSize
        mimeType
        uploadedBy { id name email }
        campaign { id name project { id name } }
        createdAt
      }
    }
  `,

  projectNotes: `
    query GetProjectNotes($projectId: ID!) {
      projectNotes(projectId: $projectId) {
        id
        message
        isPinned
        createdBy { id name email }
        updatedAt
        createdAt
      }
    }
  `,

  projectActivityFeed: `
    query GetProjectActivityFeed($projectId: ID!, $limit: Int) {
      projectActivityFeed(projectId: $projectId, limit: $limit) {
        id
        action
        entityType
        entityId
        metadata
        actor { id name email }
        createdAt
      }
    }
  `,

  projectFiles: `
    query GetProjectFiles($projectId: ID!) {
      projectFiles(projectId: $projectId) {
        id
        fileName
        fileUrl
        fileSize
        mimeType
        uploadedBy { id name email }
        campaign { id name project { id name } }
        createdAt
      }
    }
  `,

  onboardingStatus: `
    query GetOnboardingStatus($agencyId: ID!) {
      onboardingStatus(agencyId: $agencyId) {
        hasName
        hasPrimaryEmail
        hasPhone
        hasWebsite
        hasAddress
        clientCount
        contactCount
        isProfileComplete
        isOnboardingComplete
        hasDummyData
      }
    }
  `,
};

/**
 * Pre-built mutations
 */
export const mutations = {
  createAgency: `
    mutation CreateAgency($name: String!, $billingEmail: String) {
      createAgency(name: $name, billingEmail: $billingEmail) {
        id
        name
        agencyCode
        createdAt
      }
    }
  `,

  joinAgencyByCode: `
    mutation JoinAgencyByCode($agencyCode: String!) {
      joinAgencyByCode(agencyCode: $agencyCode) {
        id
        name
        agencyCode
        createdAt
      }
    }
  `,

  createClient: `
    mutation CreateClient(
      $agencyId: ID!
      $name: String!
      $accountManagerId: ID
      $industry: String
      $websiteUrl: String
      $country: String
      $logoUrl: String
      $description: String
      $clientStatus: String
      $clientSince: String
      $currency: String
      $paymentTerms: String
      $billingEmail: String
      $taxNumber: String
      $instagramHandle: String
      $youtubeUrl: String
      $tiktokHandle: String
      $linkedinUrl: String
      $source: String
      $internalNotes: String
    ) {
      createClient(
        agencyId: $agencyId
        name: $name
        accountManagerId: $accountManagerId
        industry: $industry
        websiteUrl: $websiteUrl
        country: $country
        logoUrl: $logoUrl
        description: $description
        clientStatus: $clientStatus
        clientSince: $clientSince
        currency: $currency
        paymentTerms: $paymentTerms
        billingEmail: $billingEmail
        taxNumber: $taxNumber
        instagramHandle: $instagramHandle
        youtubeUrl: $youtubeUrl
        tiktokHandle: $tiktokHandle
        linkedinUrl: $linkedinUrl
        source: $source
        internalNotes: $internalNotes
      ) {
        id
        name
        isActive
        createdAt
      }
    }
  `,

  ensureClientUser: `
    mutation EnsureClientUser {
      ensureClientUser {
        id
        email
        name
        contact { id }
      }
    }
  `,

  ensureCreatorUser: `
    mutation EnsureCreatorUser {
      ensureCreatorUser {
        id
        email
        name
      }
    }
  `,

  createContact: `
    mutation CreateContact(
      $clientId: ID!
      $firstName: String!
      $lastName: String!
      $email: String
      $phone: String
      $mobile: String
      $officePhone: String
      $homePhone: String
      $address: String
      $department: String
      $notes: String
      $isClientApprover: Boolean
      $userId: ID
      $profilePhotoUrl: String
      $jobTitle: String
      $isPrimaryContact: Boolean
      $linkedinUrl: String
      $preferredChannel: String
      $contactType: String
      $contactStatus: String
      $notificationPreference: String
      $birthday: String
    ) {
      createContact(
        clientId: $clientId
        firstName: $firstName
        lastName: $lastName
        email: $email
        phone: $phone
        mobile: $mobile
        officePhone: $officePhone
        homePhone: $homePhone
        address: $address
        department: $department
        notes: $notes
        isClientApprover: $isClientApprover
        userId: $userId
        profilePhotoUrl: $profilePhotoUrl
        jobTitle: $jobTitle
        isPrimaryContact: $isPrimaryContact
        linkedinUrl: $linkedinUrl
        preferredChannel: $preferredChannel
        contactType: $contactType
        contactStatus: $contactStatus
        notificationPreference: $notificationPreference
        birthday: $birthday
      ) {
        id
        firstName
        lastName
        email
        phone
        department
        jobTitle
        contactType
        contactStatus
        isClientApprover
        isPrimaryContact
        createdAt
      }
    }
  `,

  updateContact: `
    mutation UpdateContact(
      $id: ID!
      $firstName: String
      $lastName: String
      $email: String
      $phone: String
      $mobile: String
      $officePhone: String
      $homePhone: String
      $address: String
      $department: String
      $notes: String
      $isClientApprover: Boolean
      $userId: ID
      $profilePhotoUrl: String
      $jobTitle: String
      $isPrimaryContact: Boolean
      $linkedinUrl: String
      $preferredChannel: String
      $contactType: String
      $contactStatus: String
      $notificationPreference: String
      $birthday: String
    ) {
      updateContact(
        id: $id
        firstName: $firstName
        lastName: $lastName
        email: $email
        phone: $phone
        mobile: $mobile
        officePhone: $officePhone
        homePhone: $homePhone
        address: $address
        department: $department
        notes: $notes
        isClientApprover: $isClientApprover
        userId: $userId
        profilePhotoUrl: $profilePhotoUrl
        jobTitle: $jobTitle
        isPrimaryContact: $isPrimaryContact
        linkedinUrl: $linkedinUrl
        preferredChannel: $preferredChannel
        contactType: $contactType
        contactStatus: $contactStatus
        notificationPreference: $notificationPreference
        birthday: $birthday
      ) {
        id
        firstName
        lastName
        email
        phone
        department
        jobTitle
        contactType
        contactStatus
        isClientApprover
        isPrimaryContact
        updatedAt
      }
    }
  `,

  deleteContact: `
    mutation DeleteContact($id: ID!) {
      deleteContact(id: $id)
    }
  `,
  
  archiveClient: `
    mutation ArchiveClient($id: ID!) {
      archiveClient(id: $id) {
        id
        isActive
      }
    }
  `,
  
  createProject: `
    mutation CreateProject(
      $clientId: ID!
      $name: String!
      $description: String
      $projectType: String
      $status: String
      $projectManagerId: ID
      $clientPocId: ID
      $startDate: DateTime
      $endDate: DateTime
      $currency: String
      $influencerBudget: Float
      $agencyFee: Float
      $agencyFeeType: String
      $productionBudget: Float
      $boostingBudget: Float
      $contingency: Float
      $platforms: [String!]
      $campaignObjectives: [String!]
      $influencerTiers: [String!]
      $plannedCampaigns: Int
      $targetReach: Float
      $targetImpressions: Float
      $targetEngagementRate: Float
      $targetConversions: Float
      $influencerApprovalContactId: ID
      $contentApprovalContactId: ID
      $approvalTurnaround: String
      $reportingCadence: String
      $briefFileUrl: String
      $contractFileUrl: String
      $exclusivityClause: Boolean
      $exclusivityTerms: String
      $contentUsageRights: String
      $renewalDate: DateTime
      $externalFolderLink: String
      $priority: String
      $source: String
      $tags: [String!]
      $internalNotes: String
    ) {
      createProject(
        clientId: $clientId
        name: $name
        description: $description
        projectType: $projectType
        status: $status
        projectManagerId: $projectManagerId
        clientPocId: $clientPocId
        startDate: $startDate
        endDate: $endDate
        currency: $currency
        influencerBudget: $influencerBudget
        agencyFee: $agencyFee
        agencyFeeType: $agencyFeeType
        productionBudget: $productionBudget
        boostingBudget: $boostingBudget
        contingency: $contingency
        platforms: $platforms
        campaignObjectives: $campaignObjectives
        influencerTiers: $influencerTiers
        plannedCampaigns: $plannedCampaigns
        targetReach: $targetReach
        targetImpressions: $targetImpressions
        targetEngagementRate: $targetEngagementRate
        targetConversions: $targetConversions
        influencerApprovalContactId: $influencerApprovalContactId
        contentApprovalContactId: $contentApprovalContactId
        approvalTurnaround: $approvalTurnaround
        reportingCadence: $reportingCadence
        briefFileUrl: $briefFileUrl
        contractFileUrl: $contractFileUrl
        exclusivityClause: $exclusivityClause
        exclusivityTerms: $exclusivityTerms
        contentUsageRights: $contentUsageRights
        renewalDate: $renewalDate
        externalFolderLink: $externalFolderLink
        priority: $priority
        source: $source
        tags: $tags
        internalNotes: $internalNotes
      ) {
        id
        name
        description
        isArchived
        createdAt
      }
    }
  `,
  
  archiveProject: `
    mutation ArchiveProject($id: ID!) {
      archiveProject(id: $id) {
        id
        isArchived
      }
    }
  `,
  
  addProjectApprover: `
    mutation AddProjectApprover($projectId: ID!, $userId: ID!) {
      addProjectApprover(projectId: $projectId, userId: $userId) {
        id
        createdAt
        user { id name email }
      }
    }
  `,
  
  removeProjectApprover: `
    mutation RemoveProjectApprover($projectApproverId: ID!) {
      removeProjectApprover(projectApproverId: $projectApproverId)
    }
  `,
  
  addProjectUser: `
    mutation AddProjectUser($projectId: ID!, $userId: ID!) {
      addProjectUser(projectId: $projectId, userId: $userId) {
        id
        createdAt
        user { id name email }
      }
    }
  `,
  
  removeProjectUser: `
    mutation RemoveProjectUser($projectUserId: ID!) {
      removeProjectUser(projectUserId: $projectUserId)
    }
  `,
  
  setAgencyUserRole: `
    mutation SetAgencyUserRole($agencyId: ID!, $userId: ID!, $role: UserRole!) {
      setAgencyUserRole(agencyId: $agencyId, userId: $userId, role: $role) {
        id
        role
        user { id name email }
      }
    }
  `,
  
  createCampaign: `
    mutation CreateCampaign(
      $projectId: ID!, $name: String!, $campaignType: CampaignType!, $description: String, $approverUserIds: [ID!]!,
      $totalBudget: Money, $budgetControlType: BudgetControlType, $clientContractValue: Money,
      $objective: String, $platforms: [String!], $hashtags: [String!], $mentions: [String!],
      $postingInstructions: String, $exclusivityClause: Boolean, $exclusivityTerms: String,
      $contentUsageRights: String, $giftingEnabled: Boolean, $giftingDetails: String,
      $targetReach: Float, $targetImpressions: Float, $targetEngagementRate: Float,
      $targetViews: Float, $targetConversions: Float, $targetSales: Float,
      $utmSource: String, $utmMedium: String, $utmCampaign: String, $utmContent: String
    ) {
      createCampaign(
        projectId: $projectId, name: $name, campaignType: $campaignType, description: $description,
        approverUserIds: $approverUserIds, totalBudget: $totalBudget, budgetControlType: $budgetControlType,
        clientContractValue: $clientContractValue, objective: $objective, platforms: $platforms,
        hashtags: $hashtags, mentions: $mentions, postingInstructions: $postingInstructions,
        exclusivityClause: $exclusivityClause, exclusivityTerms: $exclusivityTerms,
        contentUsageRights: $contentUsageRights, giftingEnabled: $giftingEnabled,
        giftingDetails: $giftingDetails, targetReach: $targetReach, targetImpressions: $targetImpressions,
        targetEngagementRate: $targetEngagementRate, targetViews: $targetViews,
        targetConversions: $targetConversions, targetSales: $targetSales,
        utmSource: $utmSource, utmMedium: $utmMedium, utmCampaign: $utmCampaign, utmContent: $utmContent
      ) {
        id
        name
        status
        campaignType
        totalBudget
        budgetControlType
        createdAt
      }
    }
  `,
  
  updateCampaign: `
    mutation UpdateCampaign(
      $campaignId: ID!, $name: String, $description: String, $brief: String,
      $startDate: DateTime, $endDate: DateTime, $totalBudget: Money, $budgetControlType: BudgetControlType,
      $clientContractValue: Money, $objective: String, $platforms: [String!], $hashtags: [String!],
      $mentions: [String!], $postingInstructions: String, $exclusivityClause: Boolean,
      $exclusivityTerms: String, $contentUsageRights: String, $giftingEnabled: Boolean,
      $giftingDetails: String, $targetReach: Float, $targetImpressions: Float,
      $targetEngagementRate: Float, $targetViews: Float, $targetConversions: Float,
      $targetSales: Float, $utmSource: String, $utmMedium: String, $utmCampaign: String, $utmContent: String
    ) {
      updateCampaign(
        campaignId: $campaignId, name: $name, description: $description, brief: $brief,
        startDate: $startDate, endDate: $endDate, totalBudget: $totalBudget,
        budgetControlType: $budgetControlType, clientContractValue: $clientContractValue,
        objective: $objective, platforms: $platforms, hashtags: $hashtags, mentions: $mentions,
        postingInstructions: $postingInstructions, exclusivityClause: $exclusivityClause,
        exclusivityTerms: $exclusivityTerms, contentUsageRights: $contentUsageRights,
        giftingEnabled: $giftingEnabled, giftingDetails: $giftingDetails,
        targetReach: $targetReach, targetImpressions: $targetImpressions,
        targetEngagementRate: $targetEngagementRate, targetViews: $targetViews,
        targetConversions: $targetConversions, targetSales: $targetSales,
        utmSource: $utmSource, utmMedium: $utmMedium, utmCampaign: $utmCampaign, utmContent: $utmContent
      ) {
        id
        name
        status
      }
    }
  `,

  activateCampaign: `
    mutation ActivateCampaign($campaignId: ID!) {
      activateCampaign(campaignId: $campaignId) {
        id
        status
      }
    }
  `,
  
  submitCampaignForReview: `
    mutation SubmitCampaignForReview($campaignId: ID!) {
      submitCampaignForReview(campaignId: $campaignId) {
        id
        status
      }
    }
  `,
  
  approveCampaign: `
    mutation ApproveCampaign($campaignId: ID!) {
      approveCampaign(campaignId: $campaignId) {
        id
        status
      }
    }
  `,
  
  completeCampaign: `
    mutation CompleteCampaign($campaignId: ID!) {
      completeCampaign(campaignId: $campaignId) {
        id
        status
      }
    }
  `,
  
  archiveCampaign: `
    mutation ArchiveCampaign($campaignId: ID!) {
      archiveCampaign(campaignId: $campaignId) {
        id
        status
      }
    }
  `,
  
  updateCampaignDetails: `
    mutation UpdateCampaignDetails($campaignId: ID!, $name: String, $description: String) {
      updateCampaignDetails(campaignId: $campaignId, name: $name, description: $description) {
        id
        name
        description
      }
    }
  `,
  
  setCampaignDates: `
    mutation SetCampaignDates($campaignId: ID!, $startDate: DateTime, $endDate: DateTime) {
      setCampaignDates(campaignId: $campaignId, startDate: $startDate, endDate: $endDate) {
        id
        startDate
        endDate
      }
    }
  `,
  
  updateCampaignBrief: `
    mutation UpdateCampaignBrief($campaignId: ID!, $brief: String!) {
      updateCampaignBrief(campaignId: $campaignId, brief: $brief) {
        id
        brief
      }
    }
  `,
  
  addCampaignAttachment: `
    mutation AddCampaignAttachment($campaignId: ID!, $fileName: String!, $fileUrl: String!, $fileSize: Int, $mimeType: String) {
      addCampaignAttachment(campaignId: $campaignId, fileName: $fileName, fileUrl: $fileUrl, fileSize: $fileSize, mimeType: $mimeType) {
        id
        fileName
        fileUrl
        fileSize
        mimeType
        createdAt
      }
    }
  `,
  
  removeCampaignAttachment: `
    mutation RemoveCampaignAttachment($attachmentId: ID!) {
      removeCampaignAttachment(attachmentId: $attachmentId)
    }
  `,

  assignUserToCampaign: `
    mutation AssignUserToCampaign($campaignId: ID!, $userId: ID!, $role: String!) {
      assignUserToCampaign(campaignId: $campaignId, userId: $userId, role: $role) {
        id
        role
        user { id name email }
      }
    }
  `,

  removeUserFromCampaign: `
    mutation RemoveUserFromCampaign($campaignUserId: ID!) {
      removeUserFromCampaign(campaignUserId: $campaignUserId)
    }
  `,
  
  // Deliverable mutations
  createDeliverable: `
    mutation CreateDeliverable($campaignId: ID!, $title: String!, $deliverableType: String!, $description: String, $dueDate: DateTime) {
      createDeliverable(campaignId: $campaignId, title: $title, deliverableType: $deliverableType, description: $description, dueDate: $dueDate) {
        id
        title
        status
        deliverableType
      }
    }
  `,
  
  uploadDeliverableVersion: `
    mutation UploadDeliverableVersion($deliverableId: ID!, $fileUrl: String!, $fileName: String, $fileSize: Int, $mimeType: String, $caption: String) {
      uploadDeliverableVersion(deliverableId: $deliverableId, fileUrl: $fileUrl, fileName: $fileName, fileSize: $fileSize, mimeType: $mimeType, caption: $caption) {
        id
        versionNumber
        fileUrl
        fileName
        createdAt
      }
    }
  `,
  
  submitDeliverableForReview: `
    mutation SubmitDeliverableForReview($deliverableId: ID!) {
      submitDeliverableForReview(deliverableId: $deliverableId) {
        id
        status
      }
    }
  `,
  
  approveDeliverable: `
    mutation ApproveDeliverable($deliverableId: ID!, $versionId: ID!, $approvalLevel: ApprovalLevel!, $comment: String) {
      approveDeliverable(deliverableId: $deliverableId, versionId: $versionId, approvalLevel: $approvalLevel, comment: $comment) {
        id
        decision
        approvalLevel
      }
    }
  `,
  
  rejectDeliverable: `
    mutation RejectDeliverable($deliverableId: ID!, $versionId: ID!, $approvalLevel: ApprovalLevel!, $comment: String!) {
      rejectDeliverable(deliverableId: $deliverableId, versionId: $versionId, approvalLevel: $approvalLevel, comment: $comment) {
        id
        decision
        approvalLevel
      }
    }
  `,

  updateDeliverableVersionCaption: `
    mutation UpdateDeliverableVersionCaption($deliverableVersionId: ID!, $caption: String) {
      updateDeliverableVersionCaption(deliverableVersionId: $deliverableVersionId, caption: $caption) {
        id
        caption
        captionAudits {
          id
          oldCaption
          newCaption
          changedAt
          changedBy {
            id
            name
            email
          }
        }
      }
    }
  `,

  deleteDeliverableVersion: `
    mutation DeleteDeliverableVersion($deliverableVersionId: ID!) {
      deleteDeliverableVersion(deliverableVersionId: $deliverableVersionId)
    }
  `,

  startDeliverableTracking: `
    mutation StartDeliverableTracking($deliverableId: ID!, $urls: [String!]!) {
      startDeliverableTracking(deliverableId: $deliverableId, urls: $urls) {
        id
        urls {
          id
          url
          displayOrder
        }
        startedBy {
          id
          name
        }
        createdAt
      }
    }
  `,

  assignDeliverableToCreator: `
    mutation AssignDeliverableToCreator($deliverableId: ID!, $creatorId: ID!) {
      assignDeliverableToCreator(deliverableId: $deliverableId, creatorId: $creatorId) {
        id
        creator {
          id
          displayName
          email
        }
      }
    }
  `,

  saveAgencyEmailConfig: `
    mutation SaveAgencyEmailConfig($agencyId: ID!, $input: AgencyEmailConfigInput!) {
      saveAgencyEmailConfig(agencyId: $agencyId, input: $input) {
        id
        agencyId
        smtpHost
        smtpPort
        smtpSecure
        smtpUsername
        fromEmail
        fromName
        novuIntegrationIdentifier
        useCustomSmtp
        createdAt
        updatedAt
      }
    }
  `,

  updateAgencyLocale: `
    mutation UpdateAgencyLocale($agencyId: ID!, $input: AgencyLocaleInput!) {
      updateAgencyLocale(agencyId: $agencyId, input: $input) {
        id
        name
        currencyCode
        timezone
        languageCode
      }
    }
  `,

  updateAgencyProfile: `
    mutation UpdateAgencyProfile($agencyId: ID!, $input: UpdateAgencyProfileInput!) {
      updateAgencyProfile(agencyId: $agencyId, input: $input) {
        id
        name
        logoUrl
        description
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
        primaryEmail
        phone
        website
      }
    }
  `,

  inviteTeamMembers: `
    mutation InviteTeamMembers($agencyId: ID!, $invites: [TeamInviteInput!]!) {
      inviteTeamMembers(agencyId: $agencyId, invites: $invites) {
        id
        email
        role
        status
        createdAt
      }
    }
  `,

  revokeInvitation: `
    mutation RevokeInvitation($id: ID!) {
      revokeInvitation(id: $id)
    }
  `,

  acceptInvitation: `
    mutation AcceptInvitation($token: String!) {
      acceptInvitation(token: $token) {
        id
        name
        agencyCode
      }
    }
  `,

  // Creator mutations
  addCreator: `
    mutation AddCreator($agencyId: ID!, $displayName: String!, $email: String, $phone: String, $instagramHandle: String, $youtubeHandle: String, $tiktokHandle: String, $facebookHandle: String, $linkedinHandle: String, $notes: String, $rates: [CreatorRateInput!]) {
      addCreator(agencyId: $agencyId, displayName: $displayName, email: $email, phone: $phone, instagramHandle: $instagramHandle, youtubeHandle: $youtubeHandle, tiktokHandle: $tiktokHandle, facebookHandle: $facebookHandle, linkedinHandle: $linkedinHandle, notes: $notes, rates: $rates) {
        id
        displayName
        email
        isActive
        createdAt
      }
    }
  `,

  updateCreator: `
    mutation UpdateCreator($id: ID!, $displayName: String, $email: String, $phone: String, $instagramHandle: String, $youtubeHandle: String, $tiktokHandle: String, $facebookHandle: String, $linkedinHandle: String, $notes: String, $rates: [CreatorRateInput!]) {
      updateCreator(id: $id, displayName: $displayName, email: $email, phone: $phone, instagramHandle: $instagramHandle, youtubeHandle: $youtubeHandle, tiktokHandle: $tiktokHandle, facebookHandle: $facebookHandle, linkedinHandle: $linkedinHandle, notes: $notes, rates: $rates) {
        id
        displayName
        email
        phone
        instagramHandle
        youtubeHandle
        tiktokHandle
        facebookHandle
        linkedinHandle
        notes
        isActive
        updatedAt
      }
    }
  `,

  deactivateCreator: `
    mutation DeactivateCreator($id: ID!) {
      deactivateCreator(id: $id) {
        id
        isActive
      }
    }
  `,

  activateCreator: `
    mutation ActivateCreator($id: ID!) {
      activateCreator(id: $id) {
        id
        isActive
      }
    }
  `,

  deleteCreator: `
    mutation DeleteCreator($id: ID!) {
      deleteCreator(id: $id)
    }
  `,

  inviteCreatorToCampaign: `
    mutation InviteCreatorToCampaign($campaignId: ID!, $creatorId: ID!, $rateAmount: Money, $rateCurrency: String, $notes: String) {
      inviteCreatorToCampaign(campaignId: $campaignId, creatorId: $creatorId, rateAmount: $rateAmount, rateCurrency: $rateCurrency, notes: $notes) {
        id
        status
        rateAmount
        rateCurrency
        creator {
          id
          displayName
        }
      }
    }
  `,

  updateCampaignCreator: `
    mutation UpdateCampaignCreator($id: ID!, $rateAmount: Money, $rateCurrency: String, $notes: String) {
      updateCampaignCreator(id: $id, rateAmount: $rateAmount, rateCurrency: $rateCurrency, notes: $notes) {
        id
        rateAmount
        rateCurrency
        notes
      }
    }
  `,

  removeCreatorFromCampaign: `
    mutation RemoveCreatorFromCampaign($campaignCreatorId: ID!) {
      removeCreatorFromCampaign(campaignCreatorId: $campaignCreatorId) {
        id
        status
      }
    }
  `,

  acceptCampaignInvite: `
    mutation AcceptCampaignInvite($campaignCreatorId: ID!) {
      acceptCampaignInvite(campaignCreatorId: $campaignCreatorId) {
        id
        status
      }
    }
  `,

  declineCampaignInvite: `
    mutation DeclineCampaignInvite($campaignCreatorId: ID!) {
      declineCampaignInvite(campaignCreatorId: $campaignCreatorId) {
        id
        status
      }
    }
  `,

  // Social Media Analytics
  triggerSocialFetch: `
    mutation TriggerSocialFetch($creatorId: ID!, $platform: String!, $jobType: String!) {
      triggerSocialFetch(creatorId: $creatorId, platform: $platform, jobType: $jobType) {
        id
        platform
        jobType
        status
        createdAt
      }
    }
  `,

  // Creator Portal Mutations
  acceptProposal: `
    mutation AcceptProposal($campaignCreatorId: ID!) {
      acceptProposal(campaignCreatorId: $campaignCreatorId) {
        id
        versionNumber
        state
        rateAmount
        rateCurrency
        createdAt
      }
    }
  `,

  rejectProposal: `
    mutation RejectProposal($campaignCreatorId: ID!, $reason: String) {
      rejectProposal(campaignCreatorId: $campaignCreatorId, reason: $reason) {
        id
        versionNumber
        state
        createdAt
      }
    }
  `,

  counterProposal: `
    mutation CounterProposal($input: CounterProposalInput!) {
      counterProposal(input: $input) {
        id
        versionNumber
        state
        rateAmount
        rateCurrency
        notes
        createdAt
      }
    }
  `,

  acceptCounterProposal: `
    mutation AcceptCounterProposal($campaignCreatorId: ID!) {
      acceptCounterProposal(campaignCreatorId: $campaignCreatorId) {
        id
        versionNumber
        state
        rateAmount
        rateCurrency
        createdAt
      }
    }
  `,

  declineCounterProposal: `
    mutation DeclineCounterProposal($campaignCreatorId: ID!, $reason: String) {
      declineCounterProposal(campaignCreatorId: $campaignCreatorId, reason: $reason) {
        id
        versionNumber
        state
        createdAt
      }
    }
  `,

  reCounterProposal: `
    mutation ReCounterProposal($input: ReCounterProposalInput!) {
      reCounterProposal(input: $input) {
        id
        versionNumber
        state
        rateAmount
        rateCurrency
        createdAt
      }
    }
  `,

  reopenProposal: `
    mutation ReopenProposal($input: ReopenProposalInput!) {
      reopenProposal(input: $input) {
        id
        versionNumber
        state
        rateAmount
        rateCurrency
        createdAt
      }
    }
  `,

  addProposalNote: `
    mutation AddProposalNote($campaignCreatorId: ID!, $message: String!) {
      addProposalNote(campaignCreatorId: $campaignCreatorId, message: $message) {
        id
        message
        createdByType
        createdAt
      }
    }
  `,

  addDeliverableComment: `
    mutation AddDeliverableComment($deliverableId: ID!, $message: String!) {
      addDeliverableComment(deliverableId: $deliverableId, message: $message) {
        id
        message
        createdByType
        createdAt
      }
    }
  `,

  // Deliverable Analytics
  refreshCampaignAnalytics: `
    mutation RefreshCampaignAnalytics($campaignId: ID!) {
      refreshCampaignAnalytics(campaignId: $campaignId) {
        id
        campaignId
        status
        totalUrls
        completedUrls
        failedUrls
        createdAt
      }
    }
  `,

  // Finance Module
  setCampaignBudget: `
    mutation SetCampaignBudget($campaignId: ID!, $totalBudget: Money!, $budgetControlType: BudgetControlType, $clientContractValue: Money) {
      setCampaignBudget(campaignId: $campaignId, totalBudget: $totalBudget, budgetControlType: $budgetControlType, clientContractValue: $clientContractValue) {
        id
        totalBudget
        currency
        budgetControlType
        clientContractValue
      }
    }
  `,

  createCampaignExpense: `
    mutation CreateCampaignExpense($campaignId: ID!, $name: String!, $category: ExpenseCategory!, $originalAmount: Money!, $originalCurrency: String, $receiptUrl: String, $notes: String) {
      createCampaignExpense(campaignId: $campaignId, name: $name, category: $category, originalAmount: $originalAmount, originalCurrency: $originalCurrency, receiptUrl: $receiptUrl, notes: $notes) {
        id
        campaignId
        name
        category
        originalAmount
        originalCurrency
        fxRate
        convertedAmount
        convertedCurrency
        receiptUrl
        status
        notes
        createdAt
      }
    }
  `,

  updateCampaignExpense: `
    mutation UpdateCampaignExpense($expenseId: ID!, $name: String, $category: ExpenseCategory, $originalAmount: Money, $originalCurrency: String, $receiptUrl: String, $notes: String) {
      updateCampaignExpense(expenseId: $expenseId, name: $name, category: $category, originalAmount: $originalAmount, originalCurrency: $originalCurrency, receiptUrl: $receiptUrl, notes: $notes) {
        id
        name
        category
        originalAmount
        originalCurrency
        convertedAmount
        receiptUrl
        status
        notes
      }
    }
  `,

  deleteCampaignExpense: `
    mutation DeleteCampaignExpense($expenseId: ID!) {
      deleteCampaignExpense(expenseId: $expenseId)
    }
  `,

  markExpensePaid: `
    mutation MarkExpensePaid($expenseId: ID!) {
      markExpensePaid(expenseId: $expenseId) {
        id
        status
        paidAt
      }
    }
  `,

  markAgreementPaid: `
    mutation MarkAgreementPaid($agreementId: ID!) {
      markAgreementPaid(agreementId: $agreementId) {
        id
        status
        paidAt
      }
    }
  `,

  cancelCreatorAgreement: `
    mutation CancelCreatorAgreement($agreementId: ID!, $reason: String) {
      cancelCreatorAgreement(agreementId: $agreementId, reason: $reason) {
        id
        status
        cancelledAt
      }
    }
  `,

  // Discovery Module
  discoveryUnlock: `
    mutation DiscoveryUnlock($agencyId: ID!, $platform: DiscoveryPlatform!, $influencers: [DiscoveryUnlockInput!]!) {
      discoveryUnlock(agencyId: $agencyId, platform: $platform, influencers: $influencers) {
        id
        platform
        onsocialUserId
        searchResultId
        username
        fullname
        profileData
        tokensSpent
        unlockedBy
        unlockedAt
        expiresAt
      }
    }
  `,

  discoveryExport: `
    mutation DiscoveryExport($agencyId: ID!, $platform: DiscoveryPlatform!, $filters: JSON!, $sort: JSON, $exportType: DiscoveryExportType!, $limit: Int) {
      discoveryExport(agencyId: $agencyId, platform: $platform, filters: $filters, sort: $sort, exportType: $exportType, limit: $limit) {
        id
        platform
        exportType
        filterSnapshot
        totalAccounts
        tokensSpent
        onsocialExportId
        status
        downloadUrl
        exportedBy
        createdAt
        completedAt
      }
    }
  `,

  discoveryImportToCreators: `
    mutation DiscoveryImportToCreators($agencyId: ID!, $influencers: [DiscoveryImportInput!]!, $withContact: Boolean) {
      discoveryImportToCreators(agencyId: $agencyId, influencers: $influencers, withContact: $withContact) {
        id
        displayName
        email
        phone
        profilePictureUrl
        instagramHandle
        youtubeHandle
        tiktokHandle
        isActive
        platform
        followers
        engagementRate
        avgLikes
        contactLinks
      }
    }
  `,

  saveDiscoverySearch: `
    mutation SaveDiscoverySearch($agencyId: ID!, $name: String!, $platform: DiscoveryPlatform!, $filters: JSON!, $sortField: String, $sortOrder: String) {
      saveDiscoverySearch(agencyId: $agencyId, name: $name, platform: $platform, filters: $filters, sortField: $sortField, sortOrder: $sortOrder) {
        id
        name
        platform
        filters
        sortField
        sortOrder
        createdBy
        createdAt
      }
    }
  `,

  deleteDiscoverySearch: `
    mutation DeleteDiscoverySearch($id: ID!) {
      deleteDiscoverySearch(id: $id)
    }
  `,

  updateDiscoverySearch: `
    mutation UpdateDiscoverySearch($id: ID!, $name: String, $filters: JSON, $sortField: String, $sortOrder: String) {
      updateDiscoverySearch(id: $id, name: $name, filters: $filters, sortField: $sortField, sortOrder: $sortOrder) {
        id
        name
        platform
        filters
        sortField
        sortOrder
        createdBy
        createdAt
        updatedAt
      }
    }
  `,

  // Client Detail — Mutations
  updateClient: `
    mutation UpdateClient(
      $id: ID!, $name: String, $clientStatus: String, $logoUrl: String,
      $industry: String, $websiteUrl: String, $country: String, $description: String,
      $clientSince: String, $currency: String, $paymentTerms: String,
      $billingEmail: String, $taxNumber: String, $instagramHandle: String,
      $youtubeUrl: String, $tiktokHandle: String, $linkedinUrl: String,
      $source: String, $internalNotes: String, $accountManagerId: ID
    ) {
      updateClient(
        id: $id, name: $name, clientStatus: $clientStatus, logoUrl: $logoUrl,
        industry: $industry, websiteUrl: $websiteUrl, country: $country, description: $description,
        clientSince: $clientSince, currency: $currency, paymentTerms: $paymentTerms,
        billingEmail: $billingEmail, taxNumber: $taxNumber, instagramHandle: $instagramHandle,
        youtubeUrl: $youtubeUrl, tiktokHandle: $tiktokHandle, linkedinUrl: $linkedinUrl,
        source: $source, internalNotes: $internalNotes, accountManagerId: $accountManagerId
      ) {
        id
        name
        clientStatus
        logoUrl
        industry
        websiteUrl
        country
        description
        clientSince
        currency
        paymentTerms
        billingEmail
        taxNumber
        instagramHandle
        youtubeUrl
        tiktokHandle
        linkedinUrl
        source
        internalNotes
        accountManager { id name email }
      }
    }
  `,

  createClientNote: `
    mutation CreateClientNote($clientId: ID!, $message: String!) {
      createClientNote(clientId: $clientId, message: $message) {
        id
        message
        isPinned
        createdBy { id name email }
        updatedAt
        createdAt
      }
    }
  `,

  updateClientNote: `
    mutation UpdateClientNote($id: ID!, $message: String, $isPinned: Boolean) {
      updateClientNote(id: $id, message: $message, isPinned: $isPinned) {
        id
        message
        isPinned
        updatedAt
      }
    }
  `,

  deleteClientNote: `
    mutation DeleteClientNote($id: ID!) {
      deleteClientNote(id: $id)
    }
  `,

  // Project Notes mutations
  createProjectNote: `
    mutation CreateProjectNote($projectId: ID!, $message: String!) {
      createProjectNote(projectId: $projectId, message: $message) {
        id
        message
        isPinned
        createdBy { id name email }
        updatedAt
        createdAt
      }
    }
  `,

  updateProjectNote: `
    mutation UpdateProjectNote($id: ID!, $message: String, $isPinned: Boolean) {
      updateProjectNote(id: $id, message: $message, isPinned: $isPinned) {
        id
        message
        isPinned
        updatedAt
      }
    }
  `,

  deleteProjectNote: `
    mutation DeleteProjectNote($id: ID!) {
      deleteProjectNote(id: $id)
    }
  `,

  // Project status mutations
  updateProjectStatus: `
    mutation UpdateProjectStatus($id: ID!, $status: String!) {
      updateProjectStatus(id: $id, status: $status) {
        id
        status
      }
    }
  `,

  bulkUpdateProjectStatus: `
    mutation BulkUpdateProjectStatus($projectIds: [ID!]!, $status: String!) {
      bulkUpdateProjectStatus(projectIds: $projectIds, status: $status)
    }
  `,

  bulkArchiveProjects: `
    mutation BulkArchiveProjects($projectIds: [ID!]!) {
      bulkArchiveProjects(projectIds: $projectIds)
    }
  `,

  // Contact Detail mutations
  createContactNote: `
    mutation CreateContactNote($contactId: ID!, $message: String!) {
      createContactNote(contactId: $contactId, message: $message) {
        id
        message
        isPinned
        createdBy { id name email }
        updatedAt
        createdAt
      }
    }
  `,

  updateContactNote: `
    mutation UpdateContactNote($id: ID!, $message: String, $isPinned: Boolean) {
      updateContactNote(id: $id, message: $message, isPinned: $isPinned) {
        id
        message
        isPinned
        updatedAt
      }
    }
  `,

  deleteContactNote: `
    mutation DeleteContactNote($id: ID!) {
      deleteContactNote(id: $id)
    }
  `,

  createContactInteraction: `
    mutation CreateContactInteraction($contactId: ID!, $interactionType: String!, $interactionDate: String, $note: String) {
      createContactInteraction(contactId: $contactId, interactionType: $interactionType, interactionDate: $interactionDate, note: $note) {
        id
        interactionType
        interactionDate
        note
        createdBy { id name email }
        createdAt
      }
    }
  `,

  deleteContactInteraction: `
    mutation DeleteContactInteraction($id: ID!) {
      deleteContactInteraction(id: $id)
    }
  `,

  createContactReminder: `
    mutation CreateContactReminder($contactId: ID!, $reminderType: String, $reminderDate: String!, $note: String) {
      createContactReminder(contactId: $contactId, reminderType: $reminderType, reminderDate: $reminderDate, note: $note) {
        id
        reminderType
        reminderDate
        note
        isDismissed
        createdBy { id name email }
        createdAt
      }
    }
  `,

  dismissContactReminder: `
    mutation DismissContactReminder($id: ID!) {
      dismissContactReminder(id: $id) {
        id
        isDismissed
        updatedAt
      }
    }
  `,

  deleteContactReminder: `
    mutation DeleteContactReminder($id: ID!) {
      deleteContactReminder(id: $id)
    }
  `,

  // Project mutations (new)
  updateProject: `
    mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
      updateProject(id: $id, input: $input) {
        id name description isArchived createdAt
        projectType status priority source currency
        influencerBudget agencyFee agencyFeeType productionBudget boostingBudget contingency
        platforms campaignObjectives influencerTiers plannedCampaigns
        targetReach targetImpressions targetEngagementRate targetConversions
        approvalTurnaround reportingCadence briefFileUrl contractFileUrl
        exclusivityClause exclusivityTerms contentUsageRights
        renewalDate externalFolderLink tags internalNotes
      }
    }
  `,

  // Campaign mutations (new)
  duplicateCampaign: `
    mutation DuplicateCampaign($campaignId: ID!) {
      duplicateCampaign(campaignId: $campaignId) {
        id name status campaignType createdAt
      }
    }
  `,

  bulkUpdateCampaignStatus: `
    mutation BulkUpdateCampaignStatus($campaignIds: [ID!]!, $status: String!) {
      bulkUpdateCampaignStatus(campaignIds: $campaignIds, status: $status)
    }
  `,

  bulkArchiveCampaigns: `
    mutation BulkArchiveCampaigns($campaignIds: [ID!]!) {
      bulkArchiveCampaigns(campaignIds: $campaignIds)
    }
  `,

  // Campaign notes mutations
  createCampaignNote: `
    mutation CreateCampaignNote($campaignId: ID!, $message: String!, $noteType: String) {
      createCampaignNote(campaignId: $campaignId, message: $message, noteType: $noteType) {
        id message noteType isPinned
        createdBy { id name email }
        updatedAt createdAt
      }
    }
  `,

  updateCampaignNote: `
    mutation UpdateCampaignNote($id: ID!, $message: String, $noteType: String, $isPinned: Boolean) {
      updateCampaignNote(id: $id, message: $message, noteType: $noteType, isPinned: $isPinned) {
        id message noteType isPinned updatedAt
      }
    }
  `,

  deleteCampaignNote: `
    mutation DeleteCampaignNote($id: ID!) {
      deleteCampaignNote(id: $id)
    }
  `,

  // Deliverable management mutations (new)
  removeDeliverable: `
    mutation RemoveDeliverable($deliverableId: ID!) {
      removeDeliverable(deliverableId: $deliverableId)
    }
  `,

  requestDeliverableRevision: `
    mutation RequestDeliverableRevision($deliverableId: ID!, $reason: String) {
      requestDeliverableRevision(deliverableId: $deliverableId, reason: $reason) {
        id status
      }
    }
  `,

  sendDeliverableReminder: `
    mutation SendDeliverableReminder($deliverableId: ID!) {
      sendDeliverableReminder(deliverableId: $deliverableId)
    }
  `,

  seedDummyData: `
    mutation SeedDummyData($agencyId: ID!) {
      seedDummyData(agencyId: $agencyId)
    }
  `,

  deleteDummyData: `
    mutation DeleteDummyData($agencyId: ID!) {
      deleteDummyData(agencyId: $agencyId)
    }
  `,
};
