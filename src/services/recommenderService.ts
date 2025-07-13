import { supabase } from '../lib/supabase';
import { Rating } from '../types';

export interface RecommenderConfig {
  // Weight factors for different aspects of recommendation
  ratingWeight: number;
  genreWeight: number;
  yearWeight: number;
  directorWeight: number;
  diversityBoost: number;
}

export class RecommenderService {
  private config: RecommenderConfig = {
    ratingWeight: 0.4,
    genreWeight: 0.3,
    yearWeight: 0.1,
    directorWeight: 0.1,
    diversityBoost: 0.1
  };

  /**
   * Main recommendation algorithm
   * This is where you can implement your custom recommendation logic
   */
  async generateRecommendations(
    sessionId: string,
    userRatings: Rating[]
  ): Promise<number[]> {
    try {
      // Get user's rating patterns
      const userProfile = this.analyzeUserProfile(userRatings);
      
      // Get all movies from database
      const { data: allMovies, error } = await supabase
        .from('phase2_movies')
        .select('*');

      if (error) throw error;

      // Get movies user hasn't rated yet
      const ratedMovieIds = userRatings.map(r => r.movieId);
      const unratedMovies = allMovies?.filter(movie => 
        !ratedMovieIds.includes(movie.id)
      ) || [];

      // Calculate recommendation scores
      const recommendations = unratedMovies.map(movie => ({
        movieId: movie.id,
        score: this.calculateRecommendationScore(movie, userProfile, allMovies || [])
      }));

      // Sort by score and return top recommendations
      recommendations.sort((a, b) => b.score - a.score);
      
      // Return top 10 movie IDs (or adjust as needed)
      return recommendations.slice(0, 10).map(r => r.movieId);

    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Fallback: return movies marked as recommended in database
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Analyze user's rating patterns to create a user profile
   */
  private analyzeUserProfile(ratings: Rating[]) {
    const validRatings = ratings.filter(r => r.rating > 0);
    
    if (validRatings.length === 0) {
      return {
        averageRating: 5,
        preferredGenres: [],
        preferredYears: [],
        preferredDirectors: []
      };
    }

    const averageRating = validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length;
    
    // You can expand this to analyze genre preferences, year preferences, etc.
    // by joining with movie data
    
    return {
      averageRating,
      preferredGenres: [], // TODO: Implement genre analysis
      preferredYears: [],  // TODO: Implement year analysis
      preferredDirectors: [] // TODO: Implement director analysis
    };
  }

  /**
   * Calculate recommendation score for a movie based on user profile
   * This is the core algorithm - customize this based on your research needs
   */
  private calculateRecommendationScore(movie: any, userProfile: any, allMovies: any[]): number {
    let score = 0;

    // Base score from movie's general appeal (you can use average ratings, popularity, etc.)
    score += movie.year > 2010 ? 0.2 : 0.1; // Slight preference for newer movies
    
    // Genre matching (implement based on user's rated movies)
    // score += this.calculateGenreMatch(movie, userProfile) * this.config.genreWeight;
    
    // Year preference matching
    // score += this.calculateYearMatch(movie, userProfile) * this.config.yearWeight;
    
    // Director preference matching
    // score += this.calculateDirectorMatch(movie, userProfile) * this.config.directorWeight;
    
    // Diversity boost (recommend movies from different genres/years)
    score += this.calculateDiversityBoost(movie, allMovies) * this.config.diversityBoost;
    
    // Add randomness for serendipity
    score += Math.random() * 0.1;

    return score;
  }

  /**
   * Calculate diversity boost for a movie
   */
  private calculateDiversityBoost(movie: any, allMovies: any[]): number {
    // Simple diversity calculation - you can make this more sophisticated
    const genreCount = allMovies.filter(m => m.genre === movie.genre).length;
    const totalMovies = allMovies.length;
    
    // Less common genres get higher diversity score
    return 1 - (genreCount / totalMovies);
  }

  /**
   * Fallback recommendations when algorithm fails
   */
  private async getFallbackRecommendations(): Promise<number[]> {
    try {
      const { data: phase2Movies, error } = await supabase
        .from('phase2_movies')
        .select('id')
        .order('id')
        .limit(10);

      if (error) throw error;
      
      return phase2Movies?.map(m => m.id) || [];
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      return [];
    }
  }

  /**
   * Update configuration for A/B testing different algorithms
   */
  updateConfig(newConfig: Partial<RecommenderConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Log recommendation results for analysis
   */
  async logRecommendation(sessionId: string, recommendedMovieIds: number[]) {
    try {
      // You can create a separate table to log recommendations for analysis
      console.log('Recommended movies for session', sessionId, ':', recommendedMovieIds);
      
      // Optional: Store in database for later analysis
      // await supabase.from('recommendations_log').insert({
      //   session_id: sessionId,
      //   recommended_movies: recommendedMovieIds,
      //   algorithm_version: '1.0',
      //   created_at: new Date().toISOString()
      // });
    } catch (error) {
      console.error('Error logging recommendation:', error);
    }
  }
}

export const recommenderService = new RecommenderService();