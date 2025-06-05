# 🎬 CineBook - Movie Booking System

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white" alt="JWT" />
</p>

<p align="center">
  🎭 A modern, scalable movie booking system built with NestJS and TypeScript
</p>

## 📖 Overview

CineBook is a comprehensive movie booking platform that brings the cinema experience to your fingertips. Built with enterprise-grade architecture using NestJS, this system provides a robust foundation for managing movies, theaters, schedules, and bookings with real-time seat availability tracking.

### ✨ Key Features

🎬 **Movie Management**

- Complete CRUD operations for movies with rich metadata
- Integration with The Movie Database (TMDB) for automatic data population
- Advanced filtering by genres, tags, and ratings
- File upload support for posters and media

🎭 **Studio & Seat Management**

- Dynamic studio creation with customizable seating layouts
- Real-time seat availability tracking
- Flexible seat pricing and categorization
- Visual seat map generation

📅 **Movie Scheduling**

- Intelligent scheduling system with conflict detection
- Multiple showtimes per day across different studios
- Automated availability calculations
- Buffer time management between shows

🎫 **Booking System**

- Real-time seat reservation with automatic hold/release
- Secure payment processing flow
- Order history and ticket management
- Booking conflict prevention

🔐 **Authentication & Authorization**

- JWT-based authentication with refresh token support
- Role-based access control (Admin/User)
- Secure admin operations with specialized guards
- Session management and logout functionality

⚡ **Performance & Scalability**

- Redis caching for high-performance operations
- Background job processing with BullMQ
- Database optimization with TypeORM
- API rate limiting and security measures

## 🏗️ Architecture

The application follows a modular architecture pattern with clear separation of concerns:

```
src/
├── modules/           # Feature modules
│   ├── auth/         # Authentication & authorization
│   ├── movies/       # Movie management
│   ├── orders/       # Booking & order processing
│   ├── studio/       # Theater & seat management
│   └── users/        # User management
├── common/           # Shared utilities & decorators
├── core/             # Core services (DB, storage, scheduler)
└── main.ts          # Application bootstrap
```

### 🎯 Core Modules

**Authentication Module** (`/auth`)

- JWT strategy implementation with access/refresh tokens
- Admin and user guards for role-based protection
- Secure login/logout with token management

**Movies Module** (`/movies`)

- Movie CRUD with rich metadata support
- Tag management and categorization
- TMDB integration for automatic data enrichment
- Advanced search and filtering capabilities

**Orders Module** (`/orders`)

- Movie schedule management
- Seat booking with real-time availability
- Order processing and history tracking
- Booking conflict resolution

**Studio Module** (`/studio`)

- Theater and studio management
- Dynamic seat layout generation
- Seat availability and pricing management

**Users Module** (`/users`)

- User profile management
- Role assignment and permissions
- User authentication data

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js (v16 or higher)
- Yarn package manager
- MySQL database
- Redis server

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd nest-movies
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   # Configure your database, Redis, and other environment variables
   ```

4. **Database Setup**

   ```bash
   # Run migrations
   yarn migrat

   # Seed initial data
   yarn seed:run
   ```

### 🔧 Development

```bash
# Start in development mode with hot reload
yarn start:dev

# Start in watch mode
yarn start

# Production build
yarn build
yarn start:prod
```

### 🧪 Testing

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e

# Test coverage
yarn test:cov
```

## 📚 API Documentation

The API documentation is automatically generated using Swagger and can be accessed at:

```
http://localhost:3000/api/docs
```

### 🔑 Authentication Endpoints

| Method | Endpoint        | Description                                     |
| ------ | --------------- | ----------------------------------------------- |
| POST   | `/auth/signup`  | Register new user account with email validation |
| POST   | `/auth/signin`  | User login with email and password              |
| POST   | `/auth/refresh` | Refresh access token using refresh token        |
| POST   | `/auth/logout`  | User logout and token invalidation              |

### 🎬 Movie Endpoints

| Method | Endpoint           | Description                                     |
| ------ | ------------------ | ----------------------------------------------- |
| GET    | `/movies`          | Get paginated movies with filtering and search  |
| GET    | `/movies/:id`      | Get movie details by ID with tags and schedules |
| POST   | `/movies`          | Create new movie with TMDB integration (Admin)  |
| PATCH  | `/movies/:id`      | Update movie details and metadata (Admin)       |
| DELETE | `/movies/:id`      | Soft delete movie and related data (Admin)      |
| GET    | `/movies/:id/tags` | Get all tags associated with a movie            |
| POST   | `/movies/:id/tags` | Add tags to a movie (Admin)                     |
| DELETE | `/movies/:id/tags` | Remove tags from a movie (Admin)                |

### 📅 Movie Schedule Endpoints

| Method | Endpoint                     | Description                                 |
| ------ | ---------------------------- | ------------------------------------------- |
| GET    | `/movie-schedules`           | Get schedules with advanced filtering       |
| GET    | `/movie-schedules/:id`       | Get schedule details with seat availability |
| POST   | `/movie-schedules`           | Create new movie schedule (Admin)           |
| PATCH  | `/movie-schedules/:id`       | Update schedule details (Admin)             |
| DELETE | `/movie-schedules/:id`       | Delete movie schedule (Admin)               |
| GET    | `/movie-schedules/:id/seats` | Get real-time seat availability and pricing |

### 🎫 Order & Booking Endpoints

| Method | Endpoint            | Description                               |
| ------ | ------------------- | ----------------------------------------- |
| POST   | `/orders`           | Create new booking with seat reservations |
| GET    | `/orders/my-orders` | Get user's order history with details     |
| GET    | `/orders/:id`       | Get specific order details and status     |

### 🏢 Studio & Seat Management

| Method | Endpoint       | Description                               |
| ------ | -------------- | ----------------------------------------- |
| GET    | `/studios`     | Get all studios with basic information    |
| GET    | `/studios/:id` | Get studio details with seating layout    |
| POST   | `/studios`     | Create new studio with seat configuration |
| PATCH  | `/studios/:id` | Update studio details and layout (Admin)  |
| DELETE | `/studios/:id` | Delete studio and associated data (Admin) |
| GET    | `/seats`       | Get seats with filtering by studio        |
| POST   | `/seats`       | Create new seats for a studio (Admin)     |
| PATCH  | `/seats/:id`   | Update seat details and pricing (Admin)   |
| DELETE | `/seats/:id`   | Delete seat from studio (Admin)           |

### 👤 User Management

| Method | Endpoint               | Description                          |
| ------ | ---------------------- | ------------------------------------ |
| GET    | `/users/profile`       | Get current user profile information |
| PATCH  | `/users/profile`       | Update user profile details          |
| POST   | `/users/upload-avatar` | Upload user avatar image             |

### 🏷️ Tag Management

| Method | Endpoint    | Description                                  |
| ------ | ----------- | -------------------------------------------- |
| GET    | `/tags`     | Get all available tags with usage statistics |
| POST   | `/tags`     | Create new tag for movie categorization      |
| PATCH  | `/tags/:id` | Update tag name and description (Admin)      |
| DELETE | `/tags/:id` | Delete tag and remove associations (Admin)   |

### 📁 File Upload

| Method | Endpoint  | Description                            |
| ------ | --------- | -------------------------------------- |
| POST   | `/upload` | Upload single file (images, documents) |

## 🛠️ Technology Stack

### Backend Framework

- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript
- **Express** - Web application framework

### Database & ORM

- **MySQL** - Relational database
- **TypeORM** - Object-relational mapping
- **Redis** - Job queue processing with BullMQ

### Authentication & Security

- **JWT** - JSON Web Tokens for authentication
- **Passport** - Authentication middleware
- **Argon2** - Password hashing with configurable parameters
- **Helmet** - Security headers
- **Cross-Origin** - Resource Sharing for secure API access

### Background Processing

- **BullMQ** - Redis-based job queue for order expiry processing
- **@nestjs/schedule** - Automated tasks for TMDB sync and token cleanup

### Documentation & Validation

- **Swagger/OpenAPI** - API documentation
- **Zod** - Schema validation with custom validation pipes

### File Handling

- **Multer** - File upload middleware
- **Sharp** - Image processing

## 🎮 User Interaction Flow

### For Regular Users:

1. **🔐 Authentication**

   - Register or login to access the platform
   - Browse movies without authentication (limited features)

2. **🎬 Movie Discovery**

   - Browse available movies with rich details
   - Filter by genres, ratings, and showtimes
   - View movie trailers and information

3. **📅 Schedule Selection**

   - Choose preferred movie and showtime
   - View available studios and seat layouts

4. **🎫 Seat Selection & Booking**

   - Select seats from real-time availability map
   - Review booking details and pricing
   - Complete secure payment process

5. **📱 Order Management**
   - View booking confirmation and tickets
   - Access order history and receipts
   - Cancel or modify bookings (if allowed)

### For Administrators:

1. **🎭 Content Management**

   - Add/edit/remove movies and metadata
   - Manage studios and seating configurations
   - Set up movie schedules and showtimes

2. **📊 System Administration**

   - Monitor booking analytics and reports
   - Manage user accounts and permissions
   - Configure system settings and pricing

3. **🔧 Operations**
   - Handle booking conflicts and issues
   - Manage refunds and cancellations
   - Monitor system performance metrics

## 🤝 Contributing

We welcome contributions to improve CineBook! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<p align="center">
  Made with ❤️ and lots of ☕ 
</p>
