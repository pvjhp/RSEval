import React, { useState, useEffect, useCallback } from 'react';
import { Movie, Rating, AppPhase, QuestionnaireData } from './types';
import { MovieCard } from './components/MovieCard';
import { ProgressBar } from './components/ProgressBar';
import { ChoiceScreen } from './components/ChoiceScreen';
import { CompletionScreen } from './components/CompletionScreen';
import { IntroScreen } from './components/IntroScreen';
import { Phase2CompletionModal } from './components/Phase2CompletionModal';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { recommenderService } from './services/recommenderService';
import { supabase } from './lib/supabase';
import { Film, Loader2, AlertCircle } from 'lucide-react';

function App() {
  const [phase, setPhase] = useState<AppPhase>('intro');
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [currentMovies, setCurrentMovies] = useState<Movie[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [loadingMovies, setLoadingMovies] = useState<boolean>(false);
  const [errorMovies, setErrorMovies] = useState<string | null>(null);
  const [minimumRatingsRequired, setMinimumRatingsRequired] = useState<number>(5);
  const [showPhase2CompletionModal, setShowPhase2CompletionModal] = useState<boolean>(false);
  const [showFinishButton, setShowFinishButton] = useState<boolean>(false);
  const [incompleteRatings, setIncompleteRatings] = useState<number[]>([]);
  const [trailerStartTimes, setTrailerStartTimes] = useState<Map<number, string>>(new Map());
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  // Initialize session and load initial movies when starting from intro
  useEffect(() => {
    if (phase === 'initial' && !sessionId) {
      initializeApp();
    }
  }, [phase]);

  // Record screen size when starting Phase 1
  useEffect(() => {
    if (phase === 'initial' && sessionId) {
      recordScreenSize();
    }
  }, [phase, sessionId]);

  const initializeApp = async () => {
    setIsInitializing(true);
    try {
      await initializeSession();
      await fetchMovies('initial');
    } catch (error) {
      console.error('Error initializing app:', error);
      setErrorMovies('Failed to initialize application');
    } finally {
      setIsInitializing(false);
    }
  };

  const recordScreenSize = async () => {
    if (!sessionId || sessionId.startsWith('local_')) return;

    try {
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      
      await supabase
        .from('user_sessions')
        .update({ 
          screen_width: screenWidth,
          screen_height: screenHeight
        })
        .eq('id', sessionId);
      
      console.log('Screen size recorded:', { screenWidth, screenHeight });
    } catch (error) {
      console.error('Error recording screen size:', error);
    }
  };

  const recordPhaseTransition = async (fromPhase: string, toPhase: string) => {
    if (!sessionId || sessionId.startsWith('local_')) return;

    try {
      await supabase
        .from('phase_transitions')
        .insert({
          session_id: sessionId,
          from_phase: fromPhase,
          to_phase: toPhase,
          timestamp: new Date().toISOString()
        });
      
      console.log('Phase transition recorded:', { fromPhase, toPhase });
    } catch (error) {
      console.error('Error recording phase transition:', error);
    }
  };

  const handleTrailerStart = (movieId: number) => {
    const startTime = new Date().toISOString();
    setTrailerStartTimes(prev => new Map(prev).set(movieId, startTime));
  };

  const handleTrailerEnd = async (movieId: number) => {
    const startTime = trailerStartTimes.get(movieId);
    if (!startTime || !sessionId || sessionId.startsWith('local_')) return;

    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

    try {
      await supabase
        .from('trailer_views')
        .insert({
          session_id: sessionId,
          movie_id: movieId,
          start_time: startTime,
          end_time: endTime,
          duration: Math.round(duration / 1000) // Convert to seconds
        });
      
      console.log('Trailer view recorded:', { movieId, duration: duration / 1000 });
    } catch (error) {
      console.error('Error recording trailer view:', error);
    }

    setTrailerStartTimes(prev => {
      const newMap = new Map(prev);
      newMap.delete(movieId);
      return newMap;
    });
  };
  const initializeSession = async () => {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date().toISOString();
    
    // Randomize minimum ratings required (5, 7, 9, 11, 13, or 15)
    const possibleMinimums = [5, 7, 9, 11, 13, 15];
    const randomMinimum = possibleMinimums[Math.floor(Math.random() * possibleMinimums.length)];
    setMinimumRatingsRequired(randomMinimum);
    
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          phase: 'initial',
          start_time: startTime,
          minimum_ratings_required: randomMinimum
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
      setSessionStartTime(Date.now());
      console.log('Session created:', data.id, 'Minimum required:', randomMinimum);
    } catch (error) {
      console.error('Error creating session:', error);
      // Continue with local session if database fails
      setSessionId(`local_${Date.now()}`);
    }
  };

  const fetchMovies = async (type: 'initial' | 'recommended') => {
    setLoadingMovies(true);
    setErrorMovies(null);
    
    try {
      if (type === 'initial') {
        // Fetch initial movies (not recommended) - now 30 movies
        const { data, error } = await supabase
          .from('movies')
          .select('*')
          .eq('is_recommended', false)
          .order('id')
          .then(result => {
            if (result.data) {
              // Shuffle the movies randomly
              const shuffled = [...result.data].sort(() => Math.random() - 0.5);
              return { ...result, data: shuffled };
            }
            return result;
          });

        if (error) throw error;
        
        if (!data || data.length === 0) {
          throw new Error('No initial movies found in database');
        }

        setCurrentMovies(data);
      } else {
        // Use recommender algorithm to get personalized recommendations
        if (sessionId) {
          const recommendedIds = await recommenderService.generateRecommendations(sessionId, ratings);
          
          if (recommendedIds.length > 0) {
            const { data, error } = await supabase
              .from('phase2_movies')
              .select('*')
              .in('id', recommendedIds)
              .order('id');

            if (error) throw error;
            
            // Log the recommendation for analysis
            await recommenderService.logRecommendation(sessionId, recommendedIds);
            
            setCurrentMovies(data || []);
          } else {
            // Fallback to first 10 Phase 2 movies
            const { data, error } = await supabase
              .from('phase2_movies')
              .select('*')
              .order('id')
              .limit(10);

            if (error) throw error;
            setCurrentMovies(data || []);
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching ${type} movies:`, error);
      setErrorMovies(`Failed to load ${type} movies`);
    } finally {
      setLoadingMovies(false);
    }
  };

  const saveRatingToDatabase = async (rating: Rating) => {
    if (!sessionId || sessionId.startsWith('local_')) {
      console.log('Skipping database save - no valid session ID');
      return;
    }

    try {
      console.log('Saving rating to database:', {
        session_id: sessionId,
        movie_id: rating.movieId,
        rating: rating.rating,
        diversity_rating: rating.diversity,
        novelty_rating: rating.novelty,
        serendipity_rating: rating.serendipity
      });

      // Check if a rating already exists for this movie and session
      const { data: existingRatings, error: checkError } = await supabase
        .from('movie_ratings')
        .select('id')
        .eq('session_id', sessionId)
        .eq('movie_id', rating.movieId)
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      // Prepare the rating data - convert -1 to null for database storage
      const ratingData = {
        rating: rating.rating >= 0 ? rating.rating : null,
        diversity_rating: (rating.diversity !== undefined && rating.diversity >= 0) ? rating.diversity : null,
        novelty_rating: (rating.novelty !== undefined && rating.novelty >= 0) ? rating.novelty : null,
        serendipity_rating: (rating.serendipity !== undefined && rating.serendipity >= 0) ? rating.serendipity : null
      };

      if (existingRatings && existingRatings.length > 0) {
        // Update existing rating
        const { error: updateError } = await supabase
          .from('movie_ratings')
          .update(ratingData)
          .eq('id', existingRatings[0].id);

        if (updateError) throw updateError;
        console.log('Rating updated successfully:', ratingData);
      } else {
        // Insert new rating - only if we have at least one valid rating
        if (ratingData.rating !== null || ratingData.diversity_rating !== null || 
            ratingData.novelty_rating !== null || ratingData.serendipity_rating !== null) {
          
          const insertData = {
            session_id: sessionId,
            movie_id: rating.movieId,
            ...ratingData,
            // Set main rating to 0 if not provided but we have additional ratings
            rating: ratingData.rating !== null ? ratingData.rating : 0
          };

          const { error: insertError } = await supabase
            .from('movie_ratings')
            .insert(insertData);

          if (insertError) throw insertError;
          console.log('Rating inserted successfully:', insertData);
        }
      }
    } catch (error) {
      console.error('Error saving rating to database:', error);
    }
  };

  const updateSessionPhase = async (newPhase: string) => {
    if (!sessionId || sessionId.startsWith('local_')) return;

    try {
      await supabase
        .from('user_sessions')
        .update({ phase: newPhase })
        .eq('id', sessionId);
      console.log('Session phase updated to:', newPhase);
    } catch (error) {
      console.error('Error updating session phase:', error);
    }
  };

  const endSession = async () => {
    if (!sessionId || sessionId.startsWith('local_')) return;

    try {
      await supabase
        .from('user_sessions')
        .update({ 
          end_time: new Date().toISOString(),
          phase: 'complete'
        })
        .eq('id', sessionId);
      console.log('Session ended');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const handleRatingChange = useCallback(async (movieId: number, rating: number) => {
    setRatings(prev => {
      const existingIndex = prev.findIndex(r => r.movieId === movieId);
      let newRatings;
      
      if (existingIndex >= 0) {
        newRatings = [...prev];
        newRatings[existingIndex] = { ...newRatings[existingIndex], rating };
      } else {
        newRatings = [...prev, { movieId, rating }];
      }
      
      // Save to database immediately
      const ratingToSave = newRatings.find(r => r.movieId === movieId);
      if (ratingToSave) {
        saveRatingToDatabase(ratingToSave);
      }
      
      return newRatings;
    });
  }, [sessionId]);

  const handleAdditionalRatingChange = useCallback(async (movieId: number, type: 'diversity' | 'novelty' | 'serendipity', value: number) => {
    setRatings(prev => {
      const existingIndex = prev.findIndex(r => r.movieId === movieId);
      let newRatings;
      
      if (existingIndex >= 0) {
        newRatings = [...prev];
        newRatings[existingIndex] = { ...newRatings[existingIndex], [type]: value };
      } else {
        // Create new rating entry with -1 for main rating (unrated)
        newRatings = [...prev, { movieId, rating: -1, [type]: value }];
      }
      
      // Save to database immediately
      const ratingToSave = newRatings.find(r => r.movieId === movieId);
      if (ratingToSave) {
        saveRatingToDatabase(ratingToSave);
      }
      
      return newRatings;
    });
  }, [sessionId]);

  const getRating = (movieId: number) => {
    return ratings.find(r => r.movieId === movieId) || { movieId, rating: -1 }; // Use -1 to indicate "not rated"
  };

  const getValidRatingsCount = () => {
    // Count ratings that are not -1 (including 0 as a valid rating)
    return ratings.filter(r => r.rating >= 0).length;
  };

  const getPhaseSpecificRatingsCount = () => {
    if (phase === 'recommendation') {
      // For recommendation phase, only count ratings for current movies
      const currentMovieIds = currentMovies.map(m => m.id);
      return ratings.filter(r => r.rating >= 0 && currentMovieIds.includes(r.movieId)).length;
    }
    return getValidRatingsCount();
  };

  const checkIncompleteRecommendationRatings = () => {
    if (phase !== 'recommendation') return [];
    
    const incomplete: number[] = [];
    currentMovies.forEach(movie => {
      const rating = getRating(movie.id);
      if (rating.rating < 0 || 
          rating.diversity === undefined || rating.diversity < 0 || 
          rating.novelty === undefined || rating.novelty < 0 || 
          rating.serendipity === undefined || rating.serendipity < 0) {
        incomplete.push(movie.id);
      }
    });
    
    return incomplete;
  };

  const canProceedToChoice = () => {
    return getValidRatingsCount() >= minimumRatingsRequired;
  };

  const allRecommendedMoviesRated = () => {
    return currentMovies.every(movie => {
      const rating = getRating(movie.id);
      return rating.rating >= 0 && 
             rating.diversity !== undefined && rating.diversity >= 0 && 
             rating.novelty !== undefined && rating.novelty >= 0 && 
             rating.serendipity !== undefined && rating.serendipity >= 0;
    });
  };

  const handleStartFromIntro = () => {
    recordPhaseTransition('intro', 'initial');
    setPhase('initial');
  };

  const handleGetRecommendations = async () => {
    recordPhaseTransition('choice', 'recommendation');
    setPhase('recommendation');
    await updateSessionPhase('recommendation');
    await fetchMovies('recommended');
  };

  const handleRateMore = async () => {
    setPhase('initial');
    await fetchMovies('initial');
  };

  const handleFinishAttempt = () => {
    if (phase === 'recommendation') {
      const incomplete = checkIncompleteRecommendationRatings();
      if (incomplete.length > 0) {
        setIncompleteRatings(incomplete);
        return;
      }
    }
    
    recordPhaseTransition(phase, 'questionnaire');
    setPhase('questionnaire');
  };

  const handleQuestionnaireComplete = async (questionnaireData: QuestionnaireData) => {
    // Save questionnaire data to database
    if (sessionId && !sessionId.startsWith('local_')) {
      try {
        await supabase
          .from('questionnaire_responses')
          .insert({
            session_id: sessionId,
            movie_watching_frequency: questionnaireData.movieWatchingFrequency,
            streaming_services: questionnaireData.streamingServices,
            primary_streaming_service: questionnaireData.primaryStreamingService,
            movie_genre_preferences: questionnaireData.movieGenrePreferences,
            gender: questionnaireData.gender,
            age_range: questionnaireData.ageRange,
            nationality: questionnaireData.nationality,
            occupation: questionnaireData.occupation,
            additional_comments: questionnaireData.additionalComments
          });
        console.log('Questionnaire data saved');
      } catch (error) {
        console.error('Error saving questionnaire data:', error);
      }
    }

    recordPhaseTransition('questionnaire', 'complete');
    setPhase('complete');
    await endSession();
  };

  const getAverageRating = () => {
    const validRatings = ratings.filter(r => r.rating >= 0);
    if (validRatings.length === 0) return 0;
    return validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length;
  };

  // Check for Phase 2 completion and show modal
  useEffect(() => {
    if (phase === 'recommendation' && currentMovies.length > 0 && allRecommendedMoviesRated() && !showPhase2CompletionModal && !showFinishButton) {
      setShowPhase2CompletionModal(true);
    }
  }, [ratings, phase, currentMovies, showPhase2CompletionModal, showFinishButton]);

  const handlePhase2ModifyRatings = () => {
    setShowPhase2CompletionModal(false);
    setShowFinishButton(true);
  };

  const handlePhase2Finish = () => {
    setShowPhase2CompletionModal(false);
    handleFinishAttempt();
  };

  if (phase === 'intro') {
    return <IntroScreen onStart={handleStartFromIntro} />;
  }

  if (phase === 'choice') {
    return (
      <ChoiceScreen
        ratingsCount={getValidRatingsCount()}
        onGetRecommendations={handleGetRecommendations}
        onRateMore={handleRateMore}
      />
    );
  }

  if (phase === 'questionnaire') {
    return <QuestionnaireScreen onComplete={handleQuestionnaireComplete} />;
  }

  if (phase === 'complete') {
    return (
      <CompletionScreen
        totalRatings={getValidRatingsCount()}
        averageRating={getAverageRating()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Film className="text-amber-500" size={32} />
              <h1 className="text-2xl font-bold text-white">CineRate</h1>
            </div>
            <div className="text-amber-400 font-medium">
              {phase === 'initial' ? 'Rate Movies' : 'Rate Recommendations'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loadingMovies ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Loader2 className="animate-spin text-amber-500 mx-auto mb-4" size={48} />
              <p className="text-gray-400 text-lg">Loading movies...</p>
            </div>
          </div>
        ) : errorMovies ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
              <p className="text-red-400 text-lg mb-4">{errorMovies}</p>
              <button
                onClick={() => fetchMovies(phase === 'recommendation' ? 'recommended' : 'initial')}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : currentMovies.length === 0 ? (
          !isInitializing && (
            <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <AlertCircle className="text-yellow-500 mx-auto mb-4" size={48} />
              <p className="text-gray-400 text-lg">No movies available</p>
            </div>
            </div>
          )
        ) : (
          <>
            <div className="mb-8">
              <ProgressBar
                current={getPhaseSpecificRatingsCount()}
                total={currentMovies.length}
                minimum={phase === 'initial' ? minimumRatingsRequired : undefined}
                label={
                  phase === 'initial' 
                    ? 'Initial Movie Ratings Progress' 
                    : 'Recommendation Ratings Progress'
                }
              />
              
              {phase === 'initial' && canProceedToChoice() && (
                <div className="text-center mb-6">
                  <button
                    onClick={() => {
                      recordPhaseTransition('initial', 'choice');
                      setPhase('choice');
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Continue to Next Step
                  </button>
                </div>
              )}

              {phase === 'recommendation' && (
                <div className="text-center mb-6">
                  <button
                    onClick={handleFinishAttempt}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Finish Study
                  </button>
                  
                  {incompleteRatings.length > 0 && (
                    <div className="mt-4 p-4 bg-red-900 border border-red-500 rounded-lg">
                      <p className="text-red-400 font-semibold mb-2">
                        Please complete all ratings before finishing the study.
                      </p>
                      <p className="text-red-300 text-sm">
                        Missing ratings for {incompleteRatings.length} movie(s). 
                        Movies with incomplete ratings are highlighted with red borders below.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentMovies.map((movie) => {
                const rating = getRating(movie.id);
                const isIncomplete = incompleteRatings.includes(movie.id);
                return (
                  <div
                    key={movie.id}
                    className={`${isIncomplete ? 'ring-2 ring-red-500 rounded-xl' : ''}`}
                  >
                    <MovieCard
                      movie={movie}
                      rating={rating.rating}
                      onRatingChange={(newRating) => {
                        handleRatingChange(movie.id, newRating);
                        setIncompleteRatings(prev => prev.filter(id => id !== movie.id));
                      }}
                      showAdditionalQuestions={phase === 'recommendation'}
                      diversityRating={rating.diversity || -1}
                      noveltyRating={rating.novelty || -1}
                      serendipityRating={rating.serendipity || -1}
                      onDiversityChange={(value) => {
                        handleAdditionalRatingChange(movie.id, 'diversity', value);
                        setIncompleteRatings(prev => prev.filter(id => id !== movie.id));
                      }}
                      onNoveltyChange={(value) => {
                        handleAdditionalRatingChange(movie.id, 'novelty', value);
                        setIncompleteRatings(prev => prev.filter(id => id !== movie.id));
                      }}
                      onSerendipityChange={(value) => {
                        handleAdditionalRatingChange(movie.id, 'serendipity', value);
                        setIncompleteRatings(prev => prev.filter(id => id !== movie.id));
                      }}
                      onTrailerStart={handleTrailerStart}
                      onTrailerEnd={handleTrailerEnd}
                    />
                  </div>
                );
              })}
            </div>

            {phase === 'initial' && (
              <div className="text-center mt-12">
                <p className="text-gray-400 text-lg mb-4">
                  Rate at least {minimumRatingsRequired} movies to get personalized recommendations
                </p>
                <p className="text-amber-400 text-sm">
                  {getValidRatingsCount()}/{minimumRatingsRequired} minimum ratings completed
                </p>
              </div>
            )}

          </>
        )}
      </main>

      <Phase2CompletionModal
        isOpen={showPhase2CompletionModal}
        onModifyRatings={handlePhase2ModifyRatings}
        onFinish={handlePhase2Finish}
      />
    </div>
  );
}

export default App;